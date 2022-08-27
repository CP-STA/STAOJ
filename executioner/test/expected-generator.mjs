import { Message, state } from '../src/utils/types/message.mjs';
import { requestTypes } from './globals.mjs';

// Used for generating the expected messages sent by a request for executing submissions
export function generateExpectedMessages(requiredTypes, testCases, options) {
  // Whether compiling and compiled messages should be included
  const includeCompiled = options.includeCompiled ?? false;

  // Whether the queuing and done messages should be excluded
  const justExecutor = options.justExecutor ?? false;

  // Id for the messages
  const messageId = options.messageId ?? null;

  // Any additional fields on all messages?
  const additionalFields = options.additionalFields ?? {};

  // Fields on the done message
  const doneFields = options.doneFields ?? undefined;

  // Bind the id to message constructor
  const TMessage = function (...params) {
    const message = new Message(messageId, ...params);
    return { ...message, ...additionalFields };
  };

  // Helper function to generate repeated expected test case messages
  function generateExpectedTestMessages(resultObject) {
    return Array.from(Array(testCases).keys()).flatMap((testCase) => [
      new TMessage(state.testing, { testCase: testCase + 1 }),
      new TMessage(state.tested, { testCase: testCase + 1, ...resultObject }),
    ]);
  }

  const expectedEntries = requiredTypes.map((type) => {
    const expected = [];
    if (!justExecutor) {
      expected.push(new TMessage(state.queuing));
    }

    // Cheeky IIFE
    (function () {
      // Handling compilation messages
      if (includeCompiled) {
        switch (type) {
          case requestTypes.compileError:
            expected.push(new TMessage(state.compiling));
            expected.push(new TMessage(state.compiled, { result: 'error' }));
            return;
          case requestTypes.compileSuccess:
            expected.push(new TMessage(state.compiling));
            expected.push(new TMessage(state.compiled, { result: 'success' }));
            return;
          default:
            expected.push(new TMessage(state.compiling));
            expected.push(new TMessage(state.compiled, { result: 'success' }));
        }
      }

      // Handling testing messages
      switch (type) {
        case requestTypes.testAccepted:
          expected.push(
            ...generateExpectedTestMessages({
              result: 'accepted',
              time: null,
              memory: null,
            })
          );
          return;
        case requestTypes.testWrong:
          expected.push(
            ...generateExpectedTestMessages({
              result: 'wrong',
            })
          );
          return;
        case requestTypes.testError:
          expected.push(
            ...generateExpectedTestMessages({
              result: 'error',
            })
          );
          return;
        case requestTypes.testMle:
          expected.push(
            ...generateExpectedTestMessages({
              result: 'MLE',
            })
          );
          return;
        case requestTypes.testTle:
          expected.push(
            ...generateExpectedTestMessages({
              result: 'TLE',
            })
          );
          return;
        case requestTypes.testHang:
          expected.push(
            ...generateExpectedTestMessages({
              result: 'TLE',
            })
          );
          return;
        case requestTypes.compileError:
        case requestTypes.compileSuccess:
          throw new Error(
            `Cannot pass ${type} as a required type when 'includeCompiled' not true`
          );
        default:
          throw new Error(`Unrecognised request type ${type}`);
      }
    })();
    if (!justExecutor) {
      expected.push(new TMessage(state.done, doneFields));
    }

    return [type, expected];
  });

  return Object.freeze(Object.fromEntries(expectedEntries));
}
