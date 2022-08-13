import test from 'ava';
import { promises as fs } from 'fs';
import cp from 'child_process';
import util from 'util';
import path from 'path';
import { requestTypes, languageDirs } from './request_parser.mjs';
import {
  cleanEnvironmentMacro,
  createEnvironment,
  prepareEnvironmentMacro,
} from './hook_macros.mjs';

const exec = util.promisify(cp.exec);

// --- Testing consts ---
const repoPath = path.resolve('../');
const sampleSourceCodePath = path.join(
  path.resolve('.'),
  'test',
  'sample_source_code'
);
const requiredTypes = [requestTypes.compileSuccess, requestTypes.compileError];
const compiledName = 'compiled';

// --- Testing macro ---
const testCompilingMacro = test.macro(async (t, language, requestName) => {
  // Await requests parsing to get request
  const request = t.context.requests[language][requestName];
  const tmpPath = t.context.tmpPaths[language][requestName];
  const mountPath = await createEnvironment(request, tmpPath, repoPath);

  // Assertion logic based on the request is kept within the test code to have more control
  switch (requestName) {
    case requestTypes.compileError:
      // Assert that an error is thrown
      // Assert that no compiled file found
      await t.throwsAsync(
        exec(
          `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
        ),
        undefined,
        'Container execution did not throw error'
      );
      await t.throwsAsync(
        fs.access(path.join(mountPath, compiledName)),
        undefined,
        'Compiled file found'
      );
      break;
    case requestTypes.compileSuccess:
      // Assert that no error is thrown
      // Assert that compiled file found
      // Assert that built demoter found
      await t.notThrowsAsync(
        exec(
          `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
        ),
        'Container execution threw error'
      );
      await t.notThrowsAsync(
        fs.access(path.join(mountPath, compiledName)),
        'Compiled file not found'
      );
      await t.notThrowsAsync(
        fs.access(path.join(mountPath, 'demoter.out')),
        'Demoter out file not found'
      );
      break;
  }
});

// --- Tests starts here ---
test.before(
  'Preparing the execution environment',
  prepareEnvironmentMacro,
  requiredTypes,
  languageDirs,
  sampleSourceCodePath
);
test.after.always('Cleaning up execution environment', cleanEnvironmentMacro);

// Create tests from requests
for (const language of languageDirs) {
  for (const request of requiredTypes) {
    test(
      `Testing the docker compiling script with ${request} for ${language}`,
      testCompilingMacro,
      language,
      request
    );
  }
}
