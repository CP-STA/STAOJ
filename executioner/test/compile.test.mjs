import test from 'ava';
import { promises as fs } from 'fs';
import cp from 'child_process';
import util from 'util';
import path from 'path';
import {
  requestTypes,
  parseRequests,
  languageDirs,
  filesFromRequests,
} from './request_parser.mjs';

const exec = util.promisify(cp.exec);

// Constants
const maxMem = 256000;
const maxTime = 2;

const thisPath = path.resolve('.');
const repoPath = path.resolve('../');
const sampleSourceCodeDir = 'sample_source_code';

// Object of required types and expected assertions for result
const requiredTypes = [requestTypes.compileSuccess, requestTypes.compileError];

test.before('Parse requests and build container', (t) => {
  // Generate the neccessary requests from the sample source code dir
  t.context.requests = parseRequests(
    path.join(thisPath, 'test', sampleSourceCodeDir),
    undefined,
    requiredTypes
  );

  // Generate the tmp environment names for the request
  t.context.tmpPaths = languageDirs.reduce((langAcc, lang) => {
    langAcc[lang] = requiredTypes.reduce((typeAcc, type) => {
      typeAcc[
        type
      ] = `/tmp/request_testing_container_compiling_with_${filesFromRequests[type]}_for_${lang}`;
      return typeAcc;
    }, {});
    return langAcc;
  }, {});

  // Build the execution container
  exec(
    `podman build --build-arg MAX_MEM=${maxMem} --build-arg MAX_TIME=${maxTime} . -t executioner`
  );
});

test.after.always('Cleaning up execution environment', async (t) => {
  for (const languageRequests of Object.values(t.context.tmpPaths)) {
    for (const tmpPath of Object.values(languageRequests)) {
      await fs.rmdir(tmpPath, { recursive: true });
    }
  }
});

const testCompilingMacro = test.macro(async (t, language, requestName) => {
  // Ensure requests not failing
  t.context.requests.catch((e) => {
    t.fail(e.message);
  });

  // Await requests parsing to get request
  const request = (await t.context.requests)[language][requestName];
  const tmpPath = t.context.tmpPaths[language][requestName];

  const mountPath = path.join(tmpPath, 'mount');
  const sourceCodePath = path.join(mountPath, request.fileName);
  const measurerPath = path.join(repoPath, 'tools', 'measurer');

  const compiledName = 'compiled';

  // Create the tmp and mount directory
  await fs.mkdir(tmpPath);
  await fs.mkdir(mountPath);

  // Copy over the files to build the measurer and write source code
  await Promise.all([
    fs.writeFile(sourceCodePath, request.sourceCode),
    fs.copyFile(
      path.join(measurerPath, 'demoter.c'),
      path.join(mountPath, 'demoter.c')
    ),
    fs.copyFile(
      path.join(measurerPath, 'Makefile'),
      path.join(mountPath, 'Makefile')
    ),
  ]);

  // Assertion logic based on the request is kept within the test code to have more control
  switch (requestName) {
    case requestTypes.compileError:
      // Assert that an error is thrown
      await t.throwsAsync(
        exec(
          `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
        )
      );

      // Assert that no compiled file found
      await t.throwsAsync(fs.access(path.join(mountPath, compiledName)));

      break;
    case requestTypes.compileSuccess:
      // Assert that an error is thrown
      await t.notThrowsAsync(
        exec(
          `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
        )
      );

      // Assert that compiled file found
      await t.notThrowsAsync(fs.access(path.join(mountPath, compiledName)));

      // Assert built demoter found
      await t.notThrowsAsync(fs.access(path.join(mountPath, 'demoter.out')));

      break;
  }
});

// Create tests from requests
for (const language of languageDirs) {
  for (const req of requiredTypes) {
    test(
      `Testing the docker compiling script with ${req} for ${language}`,
      testCompilingMacro,
      language,
      req
    );
  }
}
