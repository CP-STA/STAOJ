import test from 'ava';
import path from 'path';
import { promises as fs } from 'fs';
import {
  repoPath,
  thisPath,
  filesFromRequests,
  tmpRootPath,
  testSubtasksPassProblem,
  testSubtasksFailProblem,
  requestGroups,
  testSubtasksMixedProblem,
} from './globals.mjs';
import { parseRequests } from './request-parser.mjs';
import { getSupportedLanguagesSync } from '../src/utils/functions.mjs';
import { generateExpectedMessages } from './expected-generator.mjs';
import { checkMessages } from './macros.mjs';
import { TestInterface } from '../src/interfaces/test-interface.mjs';
import { runExecutioner } from '../src/executioner.mjs';

const supportedLanguages = getSupportedLanguagesSync(repoPath);

// Required types and languages for these tests
const requiredTypes = ['testAccepted', 'testError', 'compileError'];
const requiredLanguages = Object.keys(supportedLanguages);
const testingProblems = [
  testSubtasksPassProblem,
  testSubtasksFailProblem,
  testSubtasksMixedProblem,
];

const expectedMessages = {
  pass: generateExpectedMessages(
    requiredTypes.filter((m) => m !== 'compileError'),
    testSubtasksPassProblem,
    {
      includeCompiled: false,
      justExecutor: false,
      additionalProperties: { [requestGroups.all]: { judgeTime: null } },
      doneResults: {
        testAccepted: { score: 1, failedSubtasks: [] },
        testError: { score: 0, failedSubtasks: [1, 2, 3] },
      },
    }
  ),
  passCompiled: generateExpectedMessages(
    requiredTypes,
    testSubtasksPassProblem,
    {
      includeCompiled: true,
      justExecutor: false,
      additionalProperties: { [requestGroups.all]: { judgeTime: null } },
      doneResults: {
        testAccepted: { score: 1, failedSubtasks: [] },
        testError: { score: 0, failedSubtasks: [1, 2, 3] },
      },
    }
  ),
  fail: generateExpectedMessages(
    requiredTypes.filter((m) => m !== 'compileError'),
    testSubtasksFailProblem,
    {
      includeCompiled: false,
      justExecutor: false,
      additionalProperties: { [requestGroups.all]: { judgeTime: null } },
      doneResults: {
        [requestGroups.testAll]: { score: 0, failedSubtasks: [1, 2, 3] },
      },
      testedResults: {
        testAccepted: new Array(testSubtasksFailProblem.testCases).fill(
          'wrong'
        ),
      },
    }
  ),
  failCompiled: generateExpectedMessages(
    requiredTypes,
    testSubtasksFailProblem,
    {
      includeCompiled: true,
      justExecutor: false,
      additionalProperties: { [requestGroups.all]: { judgeTime: null } },
      doneResults: {
        [requestGroups.testAll]: { score: 0, failedSubtasks: [1, 2, 3] },
      },
      testedResults: {
        testAccepted: new Array(testSubtasksFailProblem.testCases).fill(
          'wrong'
        ),
      },
    }
  ),
  mixed: generateExpectedMessages(
    requiredTypes.filter((m) => m !== 'compileError'),
    testSubtasksMixedProblem,
    {
      includeCompiled: false,
      justExecutor: false,
      additionalProperties: { [requestGroups.all]: { judgeTime: null } },
      doneResults: {
        testAccepted: { score: 0.3, failedSubtasks: [2, 3] },
        testError: { score: 0, failedSubtasks: [1, 2, 3, 4] },
      },
      testedResults: {
        testAccepted: [
          'accepted',
          'accepted',
          'accepted',
          'accepted',
          'wrong',
          'wrong',
          'accepted',
          'accepted',
        ],
      },
    }
  ),
  mixedCompiled: generateExpectedMessages(
    requiredTypes,
    testSubtasksMixedProblem,
    {
      includeCompiled: true,
      justExecutor: false,
      additionalProperties: { [requestGroups.all]: { judgeTime: null } },
      doneResults: {
        testAccepted: { score: 0.3, failedSubtasks: [2, 3] },
        testError: { score: 0, failedSubtasks: [1, 2, 3, 4] },
      },
      testedResults: {
        testAccepted: [
          'accepted',
          'accepted',
          'accepted',
          'accepted',
          'wrong',
          'wrong',
          'accepted',
          'accepted',
        ],
      },
    }
  ),
};

const testSubtasksMacro = test.macro(
  async (t, language, requestName, problem) => {
    // Getting the neccessary data from the text context
    const request =
      t.context.requests[problem.name][language.name][requestName];
    const messages = [];

    console.log = () => {};

    const app = new TestInterface();
    app.onMessageSent((message) => {
      messages.push(message);
    });

    await t.notThrowsAsync(
      runExecutioner(app, {
        problemDir: problem.dir,
        tmpRootPath: path.join(thisPath, 'test', 'tmp', problem.name),
        overwriteTmpPath: true,
        baseFileName: filesFromRequests[requestName],
        checkPodman: false,
      })
    );

    setTimeout(() => {
      app.pushSubmission(request);
    }, 1000);

    await app.submissionComplete();

    // Pick either expected with or without compiled
    let expected;
    switch (problem.name) {
      case 'test-subtasks-pass':
        expected = language.compiled
          ? expectedMessages.passCompiled
          : expectedMessages.pass;
        break;
      case 'test-subtasks-fail':
        expected = language.compiled
          ? expectedMessages.failCompiled
          : expectedMessages.fail;
        break;
      case 'test-subtasks-mixed':
        expected = language.compiled
          ? expectedMessages.mixedCompiled
          : expectedMessages.mixed;
        break;
      default:
        throw new Error('Something went wrong');
    }

    const testResult = await t.try(
      'Checking the received messages',
      checkMessages,
      expected[requestName],
      messages
    );
    testResult.commit({ retainLogs: true });

    // Passing at the end to ensure test stops successfully
    t.pass();
  }
);

test.before('Prepping the environment', async (t) => {
  t.context.requests = {};
  for (const problem of testingProblems) {
    t.context.requests[problem.name] = await parseRequests(
      problem.name,
      requiredTypes,
      requiredLanguages
    ).catch((e) => {
      t.fail(e.message);
    });
  }

  // Get the tmp names used by executor
  const tmpPaths = requiredLanguages.reduce((langAcc, lang) => {
    langAcc[lang] = requiredTypes.reduce((typeAcc, type) => {
      typeAcc[type] = path.join(
        tmpRootPath,
        `request_testing_${lang}_${filesFromRequests[type]}`
      );
      return typeAcc;
    }, {});
    return langAcc;
  }, {});

  // Iterate through tmpPaths and delete tmp directories if they exist
  for (const languageRequests of Object.values(tmpPaths)) {
    for (const tmpPath of Object.values(languageRequests)) {
      await fs.rm(tmpPath, { recursive: true, force: true });
    }
  }
});

// Create tests from requests
for (const language of requiredLanguages) {
  for (const request of requiredTypes) {
    if (!supportedLanguages[language].compiled && request === 'compileError') {
      continue;
    }
    for (const problem of [
      testSubtasksPassProblem,
      testSubtasksFailProblem,
      testSubtasksMixedProblem,
    ])
      test(
        `Testing ${problem.name} with ${request} for ${language}`,
        testSubtasksMacro,
        { ...supportedLanguages[language], name: language },
        request,
        problem
      );
  }
}
