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
const requiredTypes = [
  requestTypes.testAccepted,
  requestTypes.testError,
  requestTypes.testMle,
  requestTypes.testTle,
];

// File names
const compiledName = 'compiled';
const inName = 'sample.in';
const outName = 'sample.out';
const errorName = 'error.out';

// --- Testing macro ---
const testRunningMacro = test.macro(async (t, language, requestName) => {
  // Await requests parsing to get request
  const request = t.context.requests[language][requestName];
  const tmpPath = t.context.tmpPaths[language][requestName];
  const mountPath = await createEnvironment(request, tmpPath, repoPath);

  // File paths
  const inFile = path.join(mountPath, inName);
  const outFile = path.join(mountPath, outName);
  const errorFile = path.join(mountPath, errorName);

  const input = '0\n';

  // Create in file
  await fs.writeFile(inFile, input);

  // Firstly, make sure compilation was successful and files exist
  await t.notThrowsAsync(
    exec(
      `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
    ),
    'Compilation threw error'
  );
  await t.notThrowsAsync(
    fs.access(path.join(mountPath, compiledName)),
    'Compiled file missing'
  );
  await t.notThrowsAsync(
    fs.access(path.join(mountPath, 'demoter.out')),
    'Built demoter missing'
  );

  // Assertion logic based on the request is kept within the test code to have more control
  switch (requestName) {
    case requestTypes.testAccepted: {
      // Check that execution successed
      await t.notThrowsAsync(
        exec(
          `podman run -v ${mountPath}:/app/mount executioner ./run.sh ${compiledName} ${request.language} ${inName} ${outName} ${errorName}`
        ),
        'Container execution threw error'
      );

      // Ensure the out and error files exist and contents are correct
      await t.notThrowsAsync(fs.access(outFile), 'Output file does not exist');
      await t.notThrowsAsync(
        fs.access(errorFile),
        'Error out file does not exist'
      );

      const errorContents = await fs.readFile(errorFile);
      const outContents = await fs.readFile(outFile);

      t.is(errorContents.length, 0, 'Error out file is not empty');
      t.not(outContents.length, 0, 'Output file is empty');
      break;
    }
    default: {
      // Check that execution failed
      await t.throwsAsync(
        exec(
          `podman run -v ${mountPath}:/app/mount executioner ./run.sh ${compiledName} ${request.language} ${inName} ${outName} ${errorName}`
        ),
        undefined,
        'Container execution did not throw error'
      );

      // Ensure the out and error files exist and contents are correct
      await t.notThrowsAsync(fs.access(outFile), 'Output file does not exist');
      await t.notThrowsAsync(
        fs.access(errorFile),
        'Error out file does not exist'
      );
      const errorContents = await fs.readFile(errorFile);

      t.not(errorContents.length === 0, 'Error out file is empty');

      // Additional checks for Mle and Tle
      switch (requestName) {
        case requestTypes.testMle:
          t.regex(
            errorContents.toString(),
            new RegExp('Out of memory!'),
            'Mle output did not match'
          );
          break;
        case requestTypes.testTle:
          t.regex(
            errorContents.toString(),
            new RegExp('Out of time!'),
            'Tle output did not match'
          );
      }
    }
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
      `Testing the docker running script with ${request} for ${language}`,
      testRunningMacro,
      language,
      request
    );
  }
}
