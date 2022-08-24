import test from 'ava';
import { execute } from '../executor.mjs';
import path from 'path';
import { promises as fs, readFileSync } from 'fs';
import { Message, state } from '../message.mjs';
import {
  filesFromRequests,
  parseRequests,
  requestTypes,
} from './request_parser.mjs';

// Sets the message id to null, as that as the id should exist but the specific
// value doesn't matter while testing
// The T stands for Test
const TMessage = Message.bind(null, null);

const repoPath = path.resolve('../');
const thisPath = path.resolve('.');
const sampleSourceCodePath = path.join(thisPath, 'test', 'sample_source_code');

const problem = 'test-base';
const testCases = 3;

// Required types and languages for these tests
const requiredTypes = [
  requestTypes.testAccepted,
  requestTypes.testWrong,
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

// Helper function to generate repeated expected test case messages
function generateExpectedTestMessages(totalTestCases, resultObject) {
  return Array.from(Array(totalTestCases).keys()).flatMap((testCase) => [
    new TMessage(state.testing, { testCase: testCase + 1 }),
    new TMessage(state.tested, { testCase: testCase + 1, ...resultObject }),
  ]);
}

// The expected messages to be sent by the executor for each request type
const expected = {
  [requestTypes.compileError]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'error' }),
  ],
  [requestTypes.testAccepted]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'success' }),
    ...generateExpectedTestMessages(testCases, {
      result: 'accepted',
      time: null,
      memory: null,
    }),
  ],
  [requestTypes.testWrong]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'success' }),
    ...generateExpectedTestMessages(testCases, { result: 'wrong' }),
  ],
  [requestTypes.testError]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'success' }),
    ...generateExpectedTestMessages(testCases, { result: 'error' }),
  ],
  [requestTypes.testMle]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'success' }),
    ...generateExpectedTestMessages(testCases, { result: 'MLE' }),
  ],
  [requestTypes.testTle]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'success' }),
    ...generateExpectedTestMessages(testCases, { result: 'TLE' }),
  ],
  [requestTypes.testHang]: [
    new TMessage(state.compiling),
    new TMessage(state.compiled, { result: 'success' }),
    ...generateExpectedTestMessages(testCases, { result: 'TLE' }),
  ],
};

const testExecutorMacro = test.macro(async (t, language, requestName) => {
  // Getting the neccessary data from the text context
  const request = t.context.requests[language.name][requestName];

  let i = language.compiled ? 0 : 2;
  let count = 1;
  let failed = false;

  // The mocked sendMessage function to check sent messages
  async function mockedSendMessage(message) {
    // Prevent followthrough of failure messages
    if (failed) {
      return;
    }

    const expectedMessage = expected[requestName][i];

    if (
      !t.is(
        message.state,
        expectedMessage.state,
        `Message ${count}: Expected ${expectedMessage.state} but got ${message.state}`
      )
    ) {
      failed = true;
      return;
    }

    const testResult = await t.try(
      `Checking that message ${count} is the same as expected`,
      (tt) => {
        // Check that the message states are the same
        // Check that the keys are the same
        if (
          !tt.deepEqual(
            Object.keys(message),
            Object.keys(expectedMessage),
            'A resulting message is missing some keys'
          )
        ) {
          // Printing the differences
          const additionalKeys = Object.keys(message).filter(
            (key) => !Object.keys(expectedMessage).includes(key)
          );
          const missingKeys = Object.keys(expectedMessage).filter(
            (key) => !Object.keys(message).includes(key)
          );
          tt.log(
            `Message ${count}: ${message.state} has different keys than expected:`
          );
          missingKeys.length !== 0 && tt.log(` - Missing ${missingKeys}`);
          additionalKeys.length !== 0 &&
            tt.log(` - Unexpectedly has ${additionalKeys}`);

          failed = true;
          return;
        }

        // Check that the neccessary values are the same
        if (
          !tt.true(
            Object.entries(expectedMessage)
              .filter(([_, value]) => value !== null)
              .every(
                ([key, value]) =>
                  Object.keys(message).includes(key) &&
                  Object.values(message).includes(value)
              ),
            "A resulting message's value was different than expected"
          )
        ) {
          // Printing the differences
          const differentEntries = Object.entries(message)
            .filter(([key, value]) => expectedMessage[key] !== value)
            .map(([key, value]) => [key, value, expectedMessage[key]]);
          const differentEntriesString = differentEntries.reduce(
            (str, [key, v1, v2]) =>
              v2 !== null ? str + ` {${key}: ${v2} but got ${v1}}` : str,
            ''
          );
          tt.log(
            `Message ${count}: ${message.state} has different values than expected:`
          );
          tt.log(` -${differentEntriesString}`);

          failed = true;
          return;
        }
      }
    );
    testResult.commit({ retainLogs: true });
    i++;
    count++;
  }

  await execute(repoPath, mockedSendMessage, request, {
    problemDir: 'problems-private',
    overwriteTmpPath: true,
  });
});

test.before('Prepping the environment', async (t) => {
  t.context.requests = await parseRequests(
    sampleSourceCodePath,
    problem,
    requiredTypes,
    requiredLanguages.map((langauge) => langauge.name)
  ).catch((e) => {
    t.fail(e.message);
  });

  // Get the tmp names used by executor
  const tmpPaths = requiredLanguages
    .map((language) => language.name)
    .reduce((langAcc, lang) => {
      langAcc[lang] = requiredTypes.reduce((typeAcc, type) => {
        typeAcc[
          type
        ] = `/tmp/request_testing_${lang}_${filesFromRequests[type]}`;
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
      `Testing the executor with ${request} for ${language.name}`,
      testExecutorMacro,
      language,
      request
    );
  }
}
