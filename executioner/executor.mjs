import { Message, state } from './message.mjs';
import { promises as fs } from 'fs';
import util from 'util';
import * as cp from 'node:child_process';
import { read as readLastLines } from 'read-last-lines';
import path from 'path';

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

const tleString = 'Out of time!';
const mleString = 'Out of memory!';

export async function execute(
  repoPath,
  sendMessage,
  request,
  problemDir = 'problems',
  tmpRootDir = '/tmp'
) {
  // Function for logging actions in the request
  function log(message) {
    console.log(`${request.id}: ${message}`);
  }

  console.time(`${request.id}: Execution completed in`);
  log('Preparing execution environment');

  // Bind id arg to message as that remains the same for the duration of this funcion
  // The B stands for binded
  const BMessage = Message.bind(null, request.id);

  // Setting the env paths
  const tmpPath = path.join(tmpRootDir, `request_${request.id}`);
  const mountPath = path.join(tmpPath, 'mount');
  const sourceCodePath = path.join(mountPath, request.fileName);
  const answersPath = path.join(tmpPath, 'answers');
  const inPath = path.join(tmpPath, 'in');
  const problemPath = path.join(repoPath, problemDir, request.problem);
  const measurerPath = path.join(repoPath, 'tools', 'measurer');
  const supportedLanguagesPath = path.join(
    repoPath,
    'problems',
    'supported-languages.json'
  );

  let runFile = request.fileName;

  // --- Integrity checks before builind the environment ---
  await fs.access(problemPath).catch((e) => {
    throw `Problom directory: ${problemPath} not found`;
  });

  const supportLanguages = await fs
    .readFile(supportedLanguagesPath)
    .then((file) => JSON.parse(file.toString()))
    .catch((e) => {
      throw `Supported languages file: ${supportedLanguagesPath} not found`;
    });

  const language = supportLanguages[request.language];
  if (language === undefined) {
    throw `Request language: ${request.language} not supported`;
  }

  // --- Progressing to execution ---

  // Using an async IIFE to ensure resources are cleaned up after execution or error (aka delete tmp dir)
  await (async function () {
    // --- Prepare execution environment ---

    // Prep the tmp dir
    await fs.mkdir(tmpPath);
    await Promise.all([fs.mkdir(mountPath), fs.mkdir(answersPath)]);

    // Create the in and out dirs and copy over demoter stuff
    await Promise.all([
      fs.mkdir(inPath),
      fs.copyFile(
        path.join(measurerPath, 'demoter.c'),
        path.join(mountPath, 'demoter.c')
      ),
      fs.copyFile(
        path.join(measurerPath, 'Makefile'),
        path.join(mountPath, 'Makefile')
      ),
    ]);

    // Write source code, promise will be awaited later
    const writeSourceCode = fs.writeFile(sourceCodePath, request.sourceCode);

    // Write the problem tests to the test directory and return a list of the write file promises
    // Promise will be awaited later
    const writeTestCases = fs
      .readFile(path.join(problemPath, 'test-cases.json'))
      .then((file) => JSON.parse(file.toString()))
      .then((tests) => {
        return tests.flatMap((test, i) => {
          // 0 pad number
          const n = (i + 1).toString().padStart(3, '0');

          // Write the in tests to mount/in and out tests to answers
          fs.writeFile(path.join(inPath, `test${n}.in`), test.input);
          fs.writeFile(path.join(answersPath, `test${n}.out`), test.output);
        });
      })
      .catch((e) => {
        throw 'Error parsing problem tests file';
      });

    // Parse the constraints
    const [maxMem, maxTime] = await fs
      .readFile(path.join(problemPath, 'constraints.json'))
      .then((file) => JSON.parse(file.toString()))
      .then((constraints) => [
        parseInt(constraints.memory),
        parseInt(constraints.time),
      ])
      .catch((e) => {
        throw 'Error parsing problem constraints file';
      });

    // Now we await the source code as we'll need it in a bit
    await writeSourceCode;

    log('Environment ready');

    // --- Begin execution ---

    // Does language require compilation?
    let compileCommand = `podman run -v ${mountPath}:/app/mount executioner ./compile.sh`;
    if (language.compiled) {
      // Java is an exception for compiled name
      const compiledName =
        request.language === 'java-11'
          ? `${path.parse(request.fileName).name}.class`
          : 'compiled';
      compileCommand += ` ${request.fileName} ${request.language} ${compiledName}`;
      runFile = compiledName;

      // Notify for compiling language that compiling
      sendMessage(new BMessage(state.compiling));
      log('Compiling');
    }

    // TODO: differ between compilation failure and unexpected errors

    // Compile code and build demoter in container
    try {
      // If no arguments passed to compile.sh then just build demoter
      await exec(compileCommand);
    } catch (e) {
      // Compilation error is a possible expected state, so no error thrown, return normally
      sendMessage(new BMessage(state.compiled, { result: 'error' }));
      log(`Compilation error: ${e}`);
      return;
    }

    // Send neccessary message if compiled
    if (language.compiled) {
      sendMessage(new BMessage(state.compiled, { result: 'success' }));
      log('Compilation successful');
    }

    // Begin running test cases
    await writeTestCases;

    // Iterate through files in test case input directory
    const inDir = await fs.readdir(inPath);
    for (const [i, inFile] of inDir.entries()) {
      // Padded num
      const padded = (i + 1).toString().padStart(3, '0');

      // Copy test case to mount directory
      await fs.copyFile(
        path.join(inPath, inFile),
        path.join(mountPath, inFile)
      );

      const outFile = `result${padded}.out`;
      const answerFile = `test${padded}.out`;
      const errorFile = 'error.out';

      sendMessage(new BMessage(state.testing, { testCase: i + 1 }));
      log(`Testing ${padded}`);

      // Create command and run code
      const runCommand = `podman run -v ${mountPath}:/app/mount -e MAX_MEM=${maxMem} -e MAX_TIME=${maxTime} executioner ./run.sh ${runFile} ${request.language} ${inFile} ${outFile} ${errorFile}`;
      try {
        await exec(runCommand);
      } catch (e) {
        // Figure out what the error was
        const errors = await fs.readFile(path.join(mountPath, errorFile));
        if (errors.toString().includes(mleString)) {
          sendMessage(
            new BMessage(state.tested, { testCase: i + 1, result: 'MLE' })
          );
          log(`Testing ${padded} exceeded memory limit`);
        } else if (errors.toString().includes(tleString)) {
          sendMessage(
            new BMessage(state.tested, { testCase: i + 1, result: 'TLE' })
          );
          log(`Testing ${padded} exceeded time limit`);
        } else {
          sendMessage(
            new BMessage(state.tested, { testCase: i + 1, result: 'error' })
          );
          log(`Testing ${padded} triggered runtime error`);
        }

        // Onto the next text case
        continue;
      }

      // No errors so remove stats from out file and compare to answer

      // Parse info from out file
      const info = await readLastLines(path.join(mountPath, outFile), 2);

      // Truncate out file without info lines
      await fs.truncate(
        path.join(mountPath, outFile),
        (await fs.stat(path.join(mountPath, outFile))).size - info.length
      );

      // Read the answer and result files
      const files = await Promise.all([
        fs.readFile(path.join(mountPath, outFile)),
        fs.readFile(path.join(answersPath, answerFile)),
      ]);

      // TODO: Not sure on how strict this comparison is

      // If the same
      if (files[0].equals(files[1])) {
        // Parse data from info to send out
        const infoLines = info.split('\n');
        const [timeUsed] = infoLines[0].split(' ').slice(-1);
        const [memUsed] = infoLines[1].split(' ').slice(-1);

        sendMessage(
          new BMessage(state.tested, {
            testCase: i + 1,
            result: 'accepted',
            time: timeUsed,
            memory: memUsed,
          })
        );
        log(`Tested ${padded} and accepted`);
      } else {
        sendMessage(
          new BMessage(state.tested, { testCase: i + 1, result: 'wrong' })
        );
        log(`Tested ${padded} and failed`);
      }

      // Then remove the in and out files from the mount directory and proceed to next test
      await Promise.all([
        fs.unlink(path.join(mountPath, outFile)),
        fs.unlink(path.join(mountPath, inFile)),
      ]);
    }

    console.timeEnd(`${request.id}: Execution completed in`);
  })();

  // Clean resources if created
  await fs.rmdir(tmpPath, { recursive: true }).catch(() => {});
}
