import test from 'ava';
import { promises as fs, readFileSync } from 'fs';
import cp from 'child_process';
import util from 'util';
import path from 'path';
import { requestTypes, filesFromRequests } from './request_parser.mjs';
import {
  cleanEnvironmentMacro,
  createEnvironment,
  prepareEnvironmentMacro,
} from './hook_macros.mjs';
const exec = util.promisify(cp.exec);

// --- Testing consts ---
const repoPath = path.resolve('../');
const thisPath = path.resolve('.');
const sampleSourceCodePath = path.join(thisPath, 'test', 'sample-submissions');

const mleString = 'Out of memory!';
const tleString = 'Out of time!';

// Required types and languages
const requiredTypes = [
  requestTypes.testAccepted,
  requestTypes.testError,
  requestTypes.testMle,
  requestTypes.testTle,
  requestTypes.testHang,
];
const requiredLanguages = Object.entries(
  JSON.parse(
    readFileSync(
      path.join(repoPath, 'problems', 'supported-languages.json')
    ).toString()
  )
).map(([language, data]) => ({ name: language, compiled: data.compiled }));

// Constraints
const maxMem = 128000;
const maxTime = 3000;

// File names
const inName = 'sample.in';
const outName = 'sample.out';
const errorName = 'error.out';

// --- Testing macro ---
const testRunningMacro = test.macro(async (t, language, requestName) => {
  // Fetch info from context and create environment
  const request = t.context.requests[language.name][requestName];
  const tmpPath = t.context.tmpPaths[language.name][requestName];
  const mountPath = await createEnvironment(request, tmpPath, repoPath);

  // In the case of java
  const compiledName =
    language.name === 'java-11'
      ? `${filesFromRequests[requestName]}.class`
      : 'compiled';

  // File paths
  const inFile = path.join(mountPath, inName);
  const outFile = path.join(mountPath, outName);
  const errorFile = path.join(mountPath, errorName);

  const input = '0\n';

  // Create in file
  await fs.writeFile(inFile, input);

  // Language is compiled, compile with arguments and check compilation success
  let compileCommand = `podman run -v ${mountPath}:/app/mount executioner ./compile.sh`;
  if (language.compiled) {
    compileCommand += ` ${request.fileName} ${language.name} ${compiledName}`;
    await t.notThrowsAsync(exec(compileCommand), 'Compilation threw error');
    await t.notThrowsAsync(
      fs.access(path.join(mountPath, compiledName)),
      'Compiled file missing'
    );
  } else {
    await t.notThrowsAsync(
      exec(compileCommand),
      'Demoter building threw error'
    );
  }

  // Ensure demoter was built regardless
  await t.notThrowsAsync(
    fs.access(path.join(mountPath, 'demoter.out')),
    'Built demoter missing'
  );

  // Compose run command
  let runCommand = `podman run -v ${mountPath}:/app/mount -e MAX_MEM=${maxMem} -e MAX_TIME=${maxTime} executioner ./run.sh `;
  if (language.compiled) {
    runCommand += compiledName;
  } else {
    runCommand += request.fileName;
  }
  runCommand += ` ${language.name} ${inName} ${outName} ${errorName}`;

  // Execute the run command
  const runningScript = exec(runCommand);

  // Assertion logic based on the request is kept within the test code to have more control
  switch (requestName) {
    case requestTypes.testAccepted: {
      // Check that execution successful
      const execResult = await t.try(
        'Checking the result of execution',
        async (tt) => {
          await tt.notThrowsAsync(
            runningScript,
            'Container execution threw error'
          );
          // Ensure the out and error files exist and contents are correct
          await tt.notThrowsAsync(
            fs.access(outFile),
            'Output file does not exist'
          );
          await tt.notThrowsAsync(
            fs.access(errorFile),
            'Error out file does not exist'
          );

          const errorContents = await fs.readFile(errorFile);
          const outContents = await fs.readFile(outFile);

          if (!tt.is(errorContents.length, 0, 'Error file is not empty')) {
            tt.log(`-- ${errorName}  --`);
            tt.log(errorContents.toString());

            // If error then out file might help too
            if (tt.not(outContents.length, 0, 'Output file is empty')) {
              tt.log(`-- ${outName} --`);
              tt.log(outContents.toString());
            }
          }

          return tt;
        }
      );
      execResult.commit({ retainLogs: true });

      break;
    }
    default: {
      // Check that execution failed
      const execResult = await t.try(
        'Checking the result of execution',
        async (tt) => {
          const didThrow = await tt.throwsAsync(
            runningScript,
            undefined,
            'Container execution did not throw error'
          );

          // Ensure the out and error files exist and contents are correct
          await tt.notThrowsAsync(
            fs.access(outFile),
            'Output file does not exist'
          );
          await tt.notThrowsAsync(
            fs.access(errorFile),
            'Error out file does not exist'
          );
          const errorContents = await fs.readFile(errorFile);
          const outContents = await fs.readFile(outFile);

          // If empty, maybe error is in out file
          if (!tt.not(errorContents.length === 0, 'Error out file is empty')) {
            tt.log(`-- ${errorName} --`);
            tt.log(`Empty`);
            tt.log(`-- ${outName} -- `);
            tt.log(outContents.toString());
            tt.log(`-- run script -- `);
            tt.log((await runningScript).stderr);
          } else if (!didThrow) {
            tt.log(`-- ${errorName} --`);
            tt.log(errorContents.toString());
            tt.log(`-- ${outName} -- `);
            tt.log(outContents.toString());
          }
        }
      );

      execResult.commit({ retainLogs: true });

      const errorContents = await fs.readFile(errorFile);
      const outContents = await fs.readFile(outFile);

      // Additional checks for Mle and Tle
      switch (requestName) {
        case requestTypes.testMle: {
          // Python make it hard to check for now
          const checkMessage = await t.try(
            'Checking if MLE recognised',
            async (tt) => {
              if (
                !tt.regex(
                  errorContents.toString(),
                  new RegExp('Out of memory!'),
                  'MLE output did not match'
                )
              ) {
                tt.log(`-- ${errorName} --`);
                tt.log(errorContents.toString());
                tt.log(`-- ${outName} -- `);
                tt.log(outContents.toString());
                tt.log(`-- run script stdout -- `);
                tt.log((await runningScript).stdout);
                tt.log(`-- run script stderr -- `);
                tt.log((await runningScript).stderr);
              }
            }
          );
          checkMessage.commit({ retainLogs: true });
          break;
        }
        case requestTypes.testHang:
        case requestTypes.testTle: {
          const checkMessage = await t.try(
            'Checking if TLE recognised',
            async (tt) => {
              if (
                !tt.regex(
                  errorContents.toString(),
                  new RegExp('Out of time!'),
                  'Tle output did not match'
                )
              ) {
                tt.log(`-- ${errorName} --`);
                tt.log(errorContents.toString());
                tt.log(`-- ${outName} -- `);
                tt.log(outContents.toString());
                tt.log(`-- run script stdout -- `);
                tt.log((await runningScript).stdout);
                tt.log(`-- run script stderr -- `);
                tt.log((await runningScript).stderr);
              }
            }
          );
          checkMessage.commit({ retainLogs: true });
          break;
        }
        case requestTypes.testError: {
          const checkMessage = await t.try(
            'Checking that its only an error',
            async (tt) => {
              if (
                errorContents.toString().includes(tleString) ||
                errorContents.toString().includes(mleString)
              ) {
                tt.fail('Execution did not fail with general error');
                tt.log(`-- ${errorName} --`);
                tt.log(errorContents.toString());
                tt.log(`-- ${outName} -- `);
                tt.log(outContents.toString());
                tt.log(`-- run script stdout -- `);
                tt.log((await runningScript).stdout);
                tt.log(`-- run script stderr -- `);
                tt.log((await runningScript).stderr);
              } else {
                tt.pass();
              }
            }
          );
          checkMessage.commit({ retainLogs: true });
          break;
        }
      }
    }
  }
});

// --- Tests starts here ---
test.before(
  'Preparing the execution environment',
  prepareEnvironmentMacro,
  requiredTypes,
  requiredLanguages.map((language) => language.name),
  sampleSourceCodePath,
  'running'
);
test.after.always('Cleaning up execution environment', cleanEnvironmentMacro);

// Create tests from requests
for (const language of requiredLanguages) {
  for (const request of requiredTypes) {
    test(
      `Testing the container run script with ${request} for ${language.name}`,
      testRunningMacro,
      language,
      request
    );
  }
}
