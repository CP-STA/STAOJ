import { execSync } from 'child_process';
import * as fs from 'fs';
import * as si from './socketInterface.mjs';
import * as path from 'path';

// Addresses
const to = 'webserver';
const here = 'executioner';

// Resource limits
let memLimit = 0;
let timeLimit = 0;

let tmpDir;
let mountDir;
let compiledName;
let compiledOut;
let compiledErr;

// Messages
let compilingMessage;
let compiledMessage;
let testingMessage;
let testedMessage;
let doneMessage;

// Assigning the environmental variables
const sockPath = process.env.EXER_SOCKET;
if (sockPath == null) {
  console.error('EXER_SOCKET is undefined');
  process.exit(1);
}

const repoPath = process.env.REPO_PATH;
if (repoPath == null) {
  console.error('REPO_PATH is undefined');
  process.exit(1);
}

// Initialise socket path and receiver function
try {
  si.connectSocket(sockPath);
  si.setReceiverCallback(runExecutioner);
  console.log('Connected to socket');
} catch(e) {
  console.error(`could not connect to socket at ${sockPath}`);
  console.error(e)
  process.exit(1);
}

function runExecutioner(message) {
  // Ensure message is to executioner
  if (message.to !== here) {
    return;
  }

  // Exit function for cleaning up
  function exitGracefully(exitCode = 0, exit = true) {
    si.sendMessage(doneMessage);
    fs.rmdirSync(tmpDir, { recursive: true, force: true });
    if (exit) {
      process.exit(exitCode);
    }
  }

  // Configure the tmp environments and define the constants
  try {
    prepEnv(message);
  } catch (error) {
    console.error(error);
    exitGracefully(1);
  }

  // Notify on compiling
  si.sendMessage(compilingMessage);

  // Compile the code
  try {
    compiledCode(
      `${tmpDir}/${message.source_code_file_name}`,
      message.language,
      compiledName
    );
    compiledMessage.result = 'success';
    si.sendMessage(compiledMessage);
  } catch (compileError) {
    compiledMessage.result = 'error';
    console.error('Compilation error');
    console.error(compileError);
    si.sendMessage(compiledMessage);
    exitGracefully(1);
  }

  fs.copyFileSync(
    compiledName,
    `${mountDir}/${path.basename(compiledName)}`
  );

  // Testing each case
  let count = 1;

  // Read all the .in files in the tmp dir
  fs.readdirSync(`${tmpDir}/tests`)
    .filter(function (file) {
      return path.extname(file).toLowerCase() === '.in';
    })
    .forEach(function (testIn) {
      // Setting correct absolute pat
      testIn = `${tmpDir}/tests/${testIn}`;

      // Setting the test count
      testingMessage.test_case = count;
      testedMessage.test_case = count;

      // Testing message
      si.sendMessage(testingMessage);

      try {
        // Move test in to mount
        fs.copyFileSync(testIn, `${mountDir}/${path.basename(testIn)}`);

        // Execute code
        runCode(
          compiledName,
          message.language,
          testIn,
          compiledOut,
          compiledErr
        );

        // Extract info and cut from out file
        const info = execSync(`tail -n -2 ${compiledOut}`).toString();
        const bothLines = info.split('\n');

        const timeUsed = bothLines[0].split(' ').pop();
        const memUsed = bothLines[1].split(' ').pop();

        // Remove resource info at end
        // TODO: Find a sync npm package to do this
        execSync(
          `head -n -2 ${compiledOut} > ${tmpDir}/tmp && mv ${tmpDir}/tmp ${compiledOut}`
        );

        // Parse out file and check that it exists
        let testOut = path.win32.basename(testIn, 'in') + 'out';
        testOut = `${tmpDir}/tests/${testOut}`;
        if (!fs.existsSync(testOut)) {
          console.error(`Corresponding out file, ${testOut}, does not exist`);
          exitGracefully(1);
        }

        // Compare test cases
        try {
          // TODO: Find a sync npm package to do this
          execSync(`diff ${compiledOut} ${testOut}`);
          testedMessage.time_ms = timeUsed;
          testedMessage.memory_kb = memUsed;
          testedMessage.result = 'accepted';
        } catch (error) {
          testedMessage.result = 'wrong';
        }
      } catch (error) {
        console.error('Execution error');
        console.error(error);

        const status = execSync(`tail -n -1 ${error_out}`);
        if (status.search('time')) {
          `${repoPath}/problems/${message.problem} not found`;
          testedMessage.result = 'TLE';
        } else if (status.search('memory')) {
          testedMessage.result = 'MLE';
        } else {
          testedMessage.result = 'error';
        }
      }
      si.sendMessage(testedMessage);

      count++;
    });

  exitGracefully(0, false);
}

function prepEnv(message) {
  // Define base for messages
  compilingMessage = {
    to: to,
    id: message.id,
    state: 'compiling',
  };

  compiledMessage = {
    to: to,
    id: message.id,
    state: 'compiled',
  };

  testingMessage = {
    to: to,
    id: message.id,
    state: 'testing',
  };

  testedMessage = {
    to: to,
    id: message.id,
    state: 'tested',
  };

  doneMessage = {
    to: to,
    id: message.id,
    state: 'done',
  };

  // Create tmp dir
  tmpDir = `/tmp/${message.id}`;
  fs.mkdirSync(tmpDir);

  // Create dir to be mounted
  mountDir = `${tmpDir}/mount`;
  fs.mkdirSync(mountDir);

  // Set compiled names
  compiledName = `${tmpDir}/compiled`;
  compiledOut = `${mountDir}/compiled.out`;
  compiledErr = `${mountDir}/error.err`;

  // Write source code to file
  fs.writeFileSync(
    `${tmpDir}/${message.source_code_file_name}`,
    message.source_code_content
  );

  // Check if problem exists
  if (fs.existsSync(`${repoPath}/problems/${message.problem}`)) {
    // Read test cases and parse json (assumed to be auditted)
    const testsRaw = fs.readFileSync(
      `${repoPath}/problems/${message.problem}/test_cases.json`
    );
    const testCases = JSON.parse(testsRaw);

    // Create tests directory
    fs.mkdirSync(`${tmpDir}/tests`);

    // Create test in and out files
    // Script will automatically look for .in and .out files when running
    for (var i = 1; i <= testCases.length; i++) {
      let n = i.toString();
      let l = testCases.length.toString().length;
      n = '0'.repeat(l - n.length) + n;
      fs.writeFileSync(`${tmpDir}/tests/test${n}.in`, testCases[i - 1].input);
      fs.writeFileSync(
        `${tmpDir}/tests/test${n}.out`,
        testCases[i - 1].output
      );
    }

    // Read constrains file and parse json
    const constainsRaw = fs.readFileSync(
      `${repoPath}/problems/${message.problem}/constrains.json`
    );
    const limits = JSON.parse(constainsRaw);

    memLimit = parseInt(limits.memory_kb);
    timeLimit = parseInt(limits.time_ms);
  } else {
    throw Error(`${repoPath}/problems/${message.problem} not found`);
  }
}

function compiledCode(sourceCode, language, outFile) {
  switch (language) {
    case 'gcc@11.3':
      execSync(`g++ ${sourceCode} -o ${outFile}`);
      break;
    default:
      throw Error(`${language} is unsupported`);
  }
}

function runCode(
  compiledCode,
  language,
  testInput,
  compiledOut,
  errorOut
) {
  switch (language) {
    case 'java@**':
      // Special case for java

      break;
    default:
      //execSync(`podman build --build-arg MAX_MEM=${mem_limit} --build-arg MAX_TIME=${time_limit} . -t executioner`)
      //execSync(`podman run -itv ${mount}:/app/mount executioner ./demoter.out mount/${compiled_code} 1> mount/${compiled_out} 2> mount/${error_out} < mount/${test_input}`)
      execSync(
        `MAX_MEM=${memLimit} MAX_TIME=${timeLimit} ./demoter.out ${compiledCode} 1> ${compiledOut} 2> ${errorOut} < ${testInput}`
      );
      break;
  }
}
