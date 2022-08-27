import { Message, state } from './utils/types/message.mjs';
import { promises as fs } from 'fs';
import * as cp from 'node:child_process';
import { read as readLastLines } from 'read-last-lines';
import path from 'path';
import rl from 'readline';
import { getSourceCodeFileName } from './utils/functions.mjs';
import { InvalidDataError } from './utils/types/errors.mjs';

/*
- This is where the actual execution of a request in a container occurs
- First it builds the environment, creating a tmp dir and the dir structure
- It reads the problem info and writes the test cases and source codes to files
- It then runs the main execution script within the container
  - This compiles the source code (if neccessary) and builds the demoter
  - Then it runs the test cases sequentially
- Test case results are checked asynchronously, reading the contiainer stdout for cues
- Then completes execution
*/

// File names according to spec
const supportedLangaugesFile = 'supported-languages.json';
const demoterCodeFile = 'demoter.c';
const demoterMakeFile = 'Makefile';
const problemStatementFile = 'statement.json';
const problemTestCasesFile = 'test-cases.json';
const tleString = 'Out of time!';
const mleString = 'Out of memory!';

/**
 * Executes the passed request in a containerised environment and communicate
 * the ongoing status with the sendMessage callback
 *
 * @param repoPath Path to the STAOJ repo
 * @param sendMessage Callback for sending messages
 * @param request Request object to execute
 * @param options Additional optional params: `problemDir`, `tmpRootDir`,
 * `measurerDir`, `log`, `overwriteTmpPath`
 */
export async function execute(repoPath, sendMessage, request, options = {}) {
  const problemDir = options.problemDir ?? 'problems';
  const measurerDir = options.measurerDir ?? path.join('tools', 'measurer');
  const tmpRootPath = options.tmpRootPath ?? '/tmp';
  const log = options.log ?? ((msg) => {});
  const overwriteTmpPath = options.overwriteTmpPath ?? false;
  const baseFileName = options.baseFileName ?? 'Solution';

  // What is to be returned
  const executionResult = {};

  // Bind id arg to message as that remains the same for the duration of this funcion
  // The B stands for binded
  const BMessage = Message.bind(null, request.id);

  // Setting the env paths
  const tmpPath = path.join(tmpRootPath, `request_${request.id}`);
  const mountPath = path.join(tmpPath, 'mount');
  const answersPath = path.join(tmpPath, 'answers');
  const inDir = 'in';
  const outDir = 'out';
  const inPath = path.join(mountPath, inDir);
  const outPath = path.join(mountPath, outDir);
  const problemPath = path.join(repoPath, problemDir, request.problem);
  const measurerPath = path.join(repoPath, measurerDir);
  const supportedLanguagesPath = path.join(
    repoPath,
    problemDir,
    supportedLangaugesFile
  );

  // --- Integrity checks before builind the environment ---
  log('Fetching data');

  // If allowed, overwrite the request tmpPath if it exists
  if (overwriteTmpPath) {
    await fs.rm(tmpPath, { recursive: true, force: true });
  } else {
    if (
      (
        await fs.lstat(tmpPath).catch(() => ({ isDirectory: () => false }))
      ).isDirectory()
    ) {
      throw new Error(
        `Temporary testing directory for ${request.id}: ${tmpPath} already exists`
      );
    }
  }

  await fs.access(problemPath).catch((e) => {
    throw new Error(`Problom directory ${problemPath} not found`);
  });

  const supportLanguages = await fs
    .readFile(supportedLanguagesPath)
    .then((file) => JSON.parse(file.toString()))
    .catch((e) => {
      throw new Error(
        `Supported languages file ${supportedLanguagesPath} not found`
      );
    });

  const language = supportLanguages[request.language];
  if (language === undefined) {
    throw new InvalidDataError(
      `Request language ${request.language} not supported`
    );
  }

  // --- Progressing to execution ---

  try {
    // --- Prepare execution environment ---

    log('Preparing environment');

    // Adding fileName to request
    request.fileName = getSourceCodeFileName(
      baseFileName,
      supportLanguages,
      request.language
    );
    const sourceCodePath = path.join(mountPath, request.fileName);

    // Create the tmp root dir if it doesn't already exist
    await fs
      .access(tmpRootPath)
      .catch((e) => {
        return fs.mkdir(tmpRootPath);
      })
      .catch(() => {});

    // Prep the tmp dir
    await fs.mkdir(tmpPath);
    await Promise.all([fs.mkdir(mountPath), fs.mkdir(answersPath)]);

    // Create the in and out dirs and copy over demoter stuff
    await Promise.all([
      fs.mkdir(inPath),
      fs.mkdir(outPath),
      fs.copyFile(
        path.join(measurerPath, demoterCodeFile),
        path.join(mountPath, demoterCodeFile)
      ),
      fs.copyFile(
        path.join(measurerPath, demoterMakeFile),
        path.join(mountPath, demoterMakeFile)
      ),
    ]);

    // Write source code, promise will be awaited later
    const writeSourceCode = fs.writeFile(sourceCodePath, request.sourceCode);

    const tests = await fs
      .readFile(path.join(problemPath, problemTestCasesFile))
      .catch((e) => {
        throw new Error('Could not find problem test file');
      })
      .then((file) => JSON.parse(file.toString()))
      .catch((e) => {
        throw new Error('Error parsing problem tests file');
      });

    // Write the problem tests to the test directory and return a list of the write file promises
    // Promise will be awaited later
    const writeTestCases = Promise.all(
      tests.flatMap((test, i) => {
        // 0 pad number
        const n = (i + 1).toString().padStart(3, '0');

        // Write the in tests to mount/in and out tests to answers
        return [
          fs.writeFile(path.join(inPath, `test${n}.in`), test.input),
          fs.writeFile(path.join(answersPath, `test${n}.out`), test.output),
        ];
      })
    );

    // Read the problem statements file
    const statement = await fs
      .readFile(path.join(problemPath, problemStatementFile))
      .catch((e) => {
        throw new Error(
          `Could not find problem statement file ${problemStatementFile}`
        );
      })
      .then((file) => JSON.parse(file.toString()))
      .catch((e) => {
        throw new Error('Error parsing problem statement');
      });

    const maxMem = parseInt(statement.memory);
    const maxTime = parseInt(statement.time);
    const subtasks = statement.subtasks;

    // In case subtasks is null
    let failed = false;

    // Now we await the source code as we'll need it in a bit
    await writeSourceCode;
    await writeTestCases;

    log('Environment ready');
    log('Executing submission');

    // --- Begin execution ---

    // Whole process executed in single container instance
    // It will compile if neccesary and then run all the test cases
    // The executor is listening on stdout for the progress on the execution
    // and sends the statuses via messages

    // An array to contain promises for message, which will resolve in order
    const outMessages = [];

    // Defining how to read responses from container
    async function handleContainerOut(data, index) {
      const parsed = data.split(' ');
      const status = parsed[0];

      const message = await (async function () {
        switch (status) {
          case 'compiling': {
            return new BMessage(state.compiling);
          }
          case 'compiled': {
            const result = parsed[1];

            if (!['success', 'error'].includes(result)) {
              throw new Error(
                'Error parsing compiled result from container stdout'
              );
            }
            return new BMessage(state.compiled, { result });
          }
          case 'testing': {
            const paddedTestCase = parsed[1];
            if (isNaN(paddedTestCase)) {
              throw new Error(
                'Error parsing test case number from container stdout'
              );
            }

            const testCase = parseInt(paddedTestCase);
            const subtask = tests[testCase - 1].subtask;
            return new BMessage(state.testing, {
              testCase,
              subtask,
            });
          }
          case 'tested': {
            const paddedTestCase = parsed[1];
            const result = parsed[2];

            if (isNaN(paddedTestCase)) {
              throw new Error(
                'Error parsing test case number from container stdout'
              );
            }

            const testCase = parseInt(paddedTestCase);
            const subtask = tests[testCase - 1].subtask;

            const outFile = `result${paddedTestCase}.out`;
            const errorFile = `error${paddedTestCase}.out`;
            const answerFile = `test${paddedTestCase}.out`;

            const outFilePath = path.join(outPath, outFile);
            const errorFilePath = path.join(outPath, errorFile);
            const answersFilePath = path.join(answersPath, answerFile);

            switch (result) {
              case 'success':
                const info = await readLastLines(outFilePath, 2);

                // Truncate out file without info lines
                await fs.truncate(
                  outFilePath,
                  (await fs.stat(outFilePath)).size - info.length
                );

                // Read the answer and result files
                const files = await Promise.all([
                  fs.readFile(outFilePath),
                  fs.readFile(answersFilePath),
                ]);

                // TODO: Not sure on how strict this comparison is
                // TODO: Restrict usage to be at max resourece limits

                // If the same
                if (files[0].equals(files[1])) {
                  // Parse data from info to send out
                  const infoLines = info.split('\n');
                  const [timeUsed] = infoLines[0].split(' ').slice(-1);
                  const [memUsed] = infoLines[1].split(' ').slice(-1);

                  return new BMessage(state.tested, {
                    testCase,
                    subtask,
                    result: 'accepted',
                    time: timeUsed,
                    memory: memUsed,
                  });
                } else {
                  // Wrong answer means failed subtask
                  subtask && (subtasks[subtask - 1].failed = true);
                  failed = true;
                  return new BMessage(state.tested, {
                    testCase,
                    subtask,
                    result: 'wrong',
                  });
                }
              case 'error':
                // Any error means failed subtask
                subtask && (subtasks[subtask - 1].failed = true);
                failed = true;

                // Figure out what the error was
                const errors = await fs.readFile(errorFilePath);
                if (errors.toString().includes(mleString)) {
                  return new BMessage(state.tested, {
                    testCase,
                    subtask,
                    result: 'MLE',
                  });
                } else if (errors.toString().includes(tleString)) {
                  return new BMessage(state.tested, {
                    testCase,
                    subtask,
                    result: 'TLE',
                  });
                } else {
                  return new BMessage(state.tested, {
                    testCase,
                    subtask,
                    result: 'error',
                  });
                }
              default:
                throw new Error(
                  'Error parsing tested result from container stdout'
                );
            }
          }
          default:
            throw new Error(
              `Error parsing status of container execution, got ${parsed}`
            );
        }
      })();

      // Wait for the previous message to resolve before resolving the next to ensure messages are sent in order
      index > 0 && (await outMessages[index - 1]);

      return message;
    }

    let commandArgs = ['run', '-v', `${mountPath}:/app/mount`];

    // The constraints
    commandArgs.push('-e', `MAX_MEM=${maxMem}`);
    commandArgs.push('-e', `MAX_TIME=${maxTime}`);
    commandArgs.push('executioner');

    // The container script and args
    commandArgs.push('./execute.sh', request.fileName, request.language);
    commandArgs.push(language.compiled ? 1 : 0, inDir, outDir);

    // Pushing the output into a line by line stream
    const execution = cp.spawn('podman', commandArgs);
    const outStream = rl.createInterface({
      input: execution.stdout,
    });

    // On new line printed by container
    outStream.on('line', (data) => {
      // Add to array of promises for messages
      const messageIndex = outMessages.length;
      outMessages.push(
        handleContainerOut(data, messageIndex)
          .then((message) => {
            sendMessage(message);
            log(`Message sent: ${message.state}`);
          })
          .catch((e) => {
            // It's quite difficult to propogate these errors so I have to print them here :(
            console.error('Error:', e);
            process.exit(1);
          })
      );
    });

    // Await exit from container
    await new Promise((resolve, reject) => {
      return execution.on('close', (code) => {
        code !== 0 && reject(code);
        resolve();
      });
    }).catch((code) => {
      if (code === 125) {
        throw new Error(
          'You have reached the maximum containers podman can store, run `podman rmi --all --force` to clear them'
        );
      } else {
        throw new Error(
          `Error while executing container, exited with code ${code}`
        );
      }
    });
    log('Execution complete');

    // Calculate the store and update failed tasks
    if (subtasks.length > 0) {
      executionResult.score = subtasks.reduce((score, task) => {
        if (!task.failed) {
          return score + task.score;
        }
        return score;
      }, 0);
      executionResult.failedTasks = subtasks.filter((task) => task.failed);
    } else {
      executionResult.score = failed ? 0 : 1;
    }

    // Make sure we don't have a weird error here
    if (executionResult.score > 1) {
      throw new Error(`Calculated a score greater than 1? ${executionResult}`);
    }
  } finally {
    // Upon execution completion do cleanup
    log('Cleaning up environment');
    await fs.rm(tmpPath, { recursive: true, force: true });
    log('Cleaning up complete');
  }

  return executionResult;
}
