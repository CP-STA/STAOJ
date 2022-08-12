import { Message, state } from './message.mjs';
import { promises as fs } from 'fs';
import util from 'util';
import * as cp from 'node:child_process';
import { read as readLastLines } from 'read-last-lines';

const exec = util.promisify(cp.exec);

/*
- This is where the actual execution of a request in a container occurs
- First it builds the environment, creating a tmp dir and the dir structure
- It reads the problem info and writes the test cases and source codes to files
- Builds the container
- Compiles the source code
- Runs the test cases isolated each (for now) (at the expense of slower execution)
- Checks answers of test cases 
- Complete execution
*/

export async function execute(repoPath, sendMessage, request) {
  // Function for logging actions in the request
  function log(message) {
    console.log(`${request.id}: ${message}`);
  }

  console.time(`${request.id}: Execution completed in`)
  log('Preparing execution environment');

  // Bind id arg to message as that remains the same for the duration of this funcion
  // The B stands for binded
  const BMessage = Message.bind(null, request.id);

  // Setting the env paths
  const tmpPath = `/tmp/request_${request.id}`;
  const mountPath = `${tmpPath}/mount`;
  const sourceCodePath = `${mountPath}/${request.fileName}`;
  const answersPath = `${tmpPath}/answers`;
  const inPath = `${tmpPath}/in`;
  const problemPath = `${repoPath}/problems/${request.problem}`;
  const measurerPath = `${repoPath}/tools/measurer`;

  const compiledName = 'compiled';

  // Ensure problem dir exists before we go making tmp dirs
  await fs.access(problemPath).catch((e) => {
    throw `Problim directory: ${problemPath} not found`;
  });

  // Using an async IIFE to ensure resources are cleaned up after execution or error (aka delete tmp dir)
  await (async function () {
    // Prep the tmp dir
    await fs.mkdir(tmpPath);
    await Promise.all([fs.mkdir(mountPath), fs.mkdir(answersPath)]);

    // Create the in and out dirs and copy over demoter stuff
    await Promise.all([
      fs.mkdir(inPath),
      fs.copyFile(`${measurerPath}/demoter.c`, `${mountPath}/demoter.c`),
      fs.copyFile(`${measurerPath}/Makefile`, `${mountPath}/Makefile`),
    ]);

    // Write source code, promise will be awaited later
    const writeSourceCode = fs.writeFile(sourceCodePath, request.sourceCode);

    // Write the problem tests to the test directory and return a list of the write file promises
    // Promise will be awaited later
    const writeTestCases = fs
      .readFile(`${problemPath}/test_cases.json`)
      .then((file) => JSON.parse(file.toString()))
      .then((tests) => {
        return tests.flatMap((test, i) => {
          // 0 pad number
          const n = (i + 1).toString().padStart(3, '0');

          // Write the in tests to mount/in and out tests to answers
          fs.writeFile(`${inPath}/test${n}.in`, test.input);
          fs.writeFile(`${answersPath}/test${n}.out`, test.output);
        });
      })
      .catch((e) => {
        throw 'Error parsing problem tests file';
      });

    // Parse the constrains
    const [maxMem, maxTime] = await fs
      .readFile(`${problemPath}/constrains.json`)
      .then((file) => JSON.parse(file.toString()))
      .then((constrains) => [
        parseInt(constrains.memory_kb),
        parseInt(constrains.time_ms),
      ])
      .catch((e) => {
        throw 'Error parsing problem constrains file';
      });

    // Now to begin the executor process

    // Build container
    log('Building execution container, this may take a while...');
    await exec(
      `podman build --build-arg MAX_MEM=${maxMem} --build-arg MAX_TIME=${maxTime} . -t executioner`
    );

    // Now we await the source code as we'll need it in a bit
    await writeSourceCode;

    log('Container built, environment ready');

    // Compile code and build demoter in container
    sendMessage(new BMessage(state.compiling));
    log('Compiling');

    try {
      await exec(
        `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
      );
    } catch (e) {
      // Compilation error is a possible expected state, so no error thrown, return normally
      sendMessage(new BMessage(state.compiled, { result: 'error' }));
      log(`Compilation error: ${e}`);
      return;
    }

    sendMessage(new BMessage(state.compiled, { result: 'success' }));
    log('Compilation successful');

    // Begin running test cases

    await writeTestCases;

    // Iterate through files in test case input directory
    const inDir = await fs.readdir(inPath);
    for (const [i, inFile] of inDir.entries()) {
      // Padded num
      const padded = (i + 1).toString().padStart(3, '0');

      // Copy test case to mount directory
      await fs.copyFile(`${inPath}/${inFile}`, `${mountPath}/${inFile}`);

      const outFile = `result${padded}.out`;
      const answerFile = `test${padded}.out`;
      const errorFile = 'error.out';

      sendMessage(new BMessage(state.testing, { test_case: i + 1 }));
      log(`Testing ${padded}`);

      try {
        const runResult = await exec(
          `podman run -v ${mountPath}:/app/mount executioner ./run.sh ${compiledName} ${request.language} ${inFile} ${outFile} ${errorFile}`
        );
      } catch {
        // Figure out what the error was
        const errors = await fs.readFile(`${mountPath}/${errorFile}`);
        if (errors.toString().includes('time')) {
          sendMessage(
            new BMessage(state.tested, { test_case: i + 1, result: 'TLE' })
          );
          log(`Testing ${padded} exceeded time limit`);
        } else if (errors.toString().includes('memory')) {
          sendMessage(
            new BMessage(state.tested, { test_case: i + 1, result: 'MLE' })
          );
          log(`Testing ${padded} exceeded memory limit`);
        } else {
          sendMessage(
            new BMessage(state.tested, { test_case: i + 1, result: 'error' })
          );
          log(`Testing ${padded} triggered runtime error`);
        }

        // Onto the next text case
        continue;
      }

      // No errors so remove stats from out file and compare to answer

      // Parse info from out file
      const info = await readLastLines(`${mountPath}/${outFile}`, 2);

      // Truncate out file without info lines
      await fs.truncate(
        `${mountPath}/${outFile}`,
        (await fs.stat(`${mountPath}/${outFile}`)).size - info.length
      );

      const files = await Promise.all([
        fs.readFile(`${mountPath}/${outFile}`),
        fs.readFile(`${answersPath}/${answerFile}`),
      ]);

      // If the same
      // Note, they have to be an exact match so maybe strive for less strict in the future?
      if (files[0].equals(files[1])) {
        // Parse data from info to send out
        const infoLines = info.split('\n');
        const [timeUsed] = infoLines[0].split(' ').slice(-1);
        const [memUsed] = infoLines[1].split(' ').slice(-1);

        sendMessage(
          new BMessage(state.tested, {
            test_case: i + 1,
            result: 'accepted',
            time_ms: timeUsed,
            memory_kb: memUsed,
          })
        );
        log(`Tested ${padded} and accepted`);
      } else {
        sendMessage(
          new BMessage(state.tested, { test_case: i + 1, result: 'wrong' })
        );
        log(`Tested ${padded} and failed`);
      }

      // Then remove the in and out files from the mount directory and proceed to next test
      await Promise.all([
        fs.unlink(`${mountPath}/${outFile}`),
        fs.unlink(`${mountPath}/${inFile}`),
      ]);
    }

    console.timeEnd(`${request.id}: Execution completed in`)
  })();

  // Clean resources if created
  await fs.rmdir(tmpPath, { recursive: true }).catch(() => {});
}
