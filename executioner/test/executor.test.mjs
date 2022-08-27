import test from 'ava';
import { execute } from '../src/executor.mjs';
import path from 'path';
import { promises as fs } from 'fs';
import {
  repoPath,
  requestTypes,
  filesFromRequests,
  testProblem,
  tmpRootPath,
} from './globals.mjs';
import { parseRequests } from './request-parser.mjs';
import { getSupportedLanguagesSync } from '../src/utils/functions.mjs';
import { generateExpectedMessages } from './expected-generator.mjs';
import { checkMessages } from './macros.mjs';

const supportedLanguages = getSupportedLanguagesSync(repoPath);

// Required types and languages for these tests
const requiredTypes = [
  requestTypes.testAccepted,
  requestTypes.testWrong,
  requestTypes.testError,
  requestTypes.testMle,
  requestTypes.testTle,
  requestTypes.testHang,
];
const requiredLanguages = Object.keys(supportedLanguages);

const expectedMessages = generateExpectedMessages(
  requiredTypes,
  testProblem.testCases,
  {
    includeCompiled: false,
    justExecutor: true,
  }
);
const expectedMessagesCompiled = generateExpectedMessages(
  requiredTypes,
  testProblem.testCases,
  {
    includeCompiled: true,
    justExecutor: true,
  }
);

const testExecutorMacro = test.macro(async (t, language, requestName) => {
  // Getting the neccessary data from the text context
  const request = t.context.requests[language.name][requestName];
  const messages = [];

  // The mocked sendMessage function to accumulate the messages
  function mockedSendMessage(message) {
    messages.push(message);
  }

  await t.notThrowsAsync(
    execute(repoPath, mockedSendMessage, request, {
      problemDir: testProblem.dir,
      tmpRootPath: path.join(tmpRootPath, 'executor'),
      overwriteTmpPath: true,
      baseFileName: filesFromRequests[requestName],
    })
  );

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
      `Testing the executor with ${request} for ${language}`,
      testExecutorMacro,
      { ...supportedLanguages[language], name: language },
      request
    );
  }
}
