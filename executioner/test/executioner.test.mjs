import test from 'ava';
import path from 'path';
import { promises as fs } from 'fs';
import {
  repoPath,
  filesFromRequests,
  testProblem,
  tmpRootPath,
  thisPath,
  requestGroups,
  getRequestNamesByGroup,
} from './globals.mjs';
import { parseRequests } from './request-parser.mjs';
import { getSupportedLanguagesSync } from '../src/utils/functions.mjs';
import { generateExpectedMessages } from './expected-generator.mjs';
import { runExecutioner } from '../src/executioner.mjs';
import { TestInterface } from '../src/interfaces/test-interface.mjs';
import { checkMessages } from './macros.mjs';

const supportedLanguages = getSupportedLanguagesSync(repoPath);

// Required types and languages for these tests
const requiredTypes = getRequestNamesByGroup(requestGroups.testAll);
const requiredLanguages = Object.keys(supportedLanguages);

const expectedMessages = generateExpectedMessages(requiredTypes, testProblem, {
  includeCompiled: false,
  justExecutor: false,
  additionalProperties: { [requestGroups.all]: { judgeTime: null } },
  doneResults: { [requestGroups.all]: { score: null } },
});
const expectedMessagesCompiled = generateExpectedMessages(
  requiredTypes,
  testProblem,
  {
    includeCompiled: true,
    justExecutor: false,
    additionalProperties: { [requestGroups.all]: { judgeTime: null } },
    doneResults: { [requestGroups.all]: { score: null } },
  }
);

const testExecutionerMacro = test.macro(async (t, language, requestName) => {
  // Getting the neccessary data from the text context
  const request = t.context.requests[language.name][requestName];
  const messages = [];

  console.log = () => {};

  const app = new TestInterface();
  app.onMessageSent((message) => {
    messages.push(message);
  });

  await t.notThrowsAsync(
    runExecutioner(app, {
      problemDir: 'problems-private',
      tmpRootPath: path.join(thisPath, 'test', 'tmp', 'executioner'),
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
  const expected = language.compiled
    ? expectedMessagesCompiled
    : expectedMessages;

  const testResult = await t.try(
    'Checking the received messages',
    checkMessages,
    expected[requestName],
    messages
  );
  testResult.commit({ retainLogs: true });

  // Passing at the end to ensure test stops successfully
  t.pass();
});

test.before('Prepping the environment', async (t) => {
  t.context.requests = await parseRequests(
    testProblem.name,
    requiredTypes,
    requiredLanguages
  ).catch((e) => {
    t.fail(e.message);
  });

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
    test(
      `Testing the executioner with ${request} for ${language}`,
      testExecutionerMacro,
      { ...supportedLanguages[language], name: language },
      request
    );
  }
}
