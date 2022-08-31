import { Message, state } from '../../src/utils/types/message.mjs';
import { requestGroups, requestTypes } from '../globals.mjs';

// Used for generating the expected messages sent by a request for executing submissions
export function generateExpectedMessages(
  requiredTypes,
  problem,
  {
    includeCompiled = false,
    justExecutor = false,
    messageId = null,
    noId = false,
    additionalProperties = {},
    testedResults = undefined,
    doneResults = {},
  }
) {
  // Assertions
  if (noId && messageId !== null) {
    throw new Error('noId specified yet cusotm messageId still passed?');
  } else if (noId) {
    messageId = undefined;
  }

  if (problem.subtasks) {
    if (problem.subtasks.reduce((sum, t) => sum + t, 0) !== problem.testCases) {
      throw new Error(
        'Subtask array passed does not contain the correct number of test cases'
      );
    }
  }

  if (testedResults) {
    for (const [type, order] of Object.entries(testedResults)) {
      if (order.length !== problem.testCases) {
        throw new Error(
          `Tested order array for ${type} does not contain the correct number of test cases`
        );
      }
    }
  }

  const subtaskDistribution = problem.subtasks?.flatMap((t, i) => {
    return new Array(t).fill(i + 1);
  });

  // Parsing any request groups and adding them to individual types
  const messageProps = Object.entries(additionalProperties).reduce(
    (acc, [key, props]) => {
      // If a group key
      if (Object.keys(requestGroups).includes(key)) {
        Object.entries(requestTypes).forEach(([name, info]) => {
          if (info.tags.includes(key)) {
            acc[name] = { ...(acc[name] ?? {}), ...props };
          }
        });
      } else if (Object.keys(requestTypes).includes(key)) {
        acc[key] = { ...(acc[key] ?? {}), ...props };
      } else {
        throw new Error(
          `Invalid group name ${key} passed to additionalProperties`
        );
      }
      return acc;
    },
    {}
  );

  const doneProps = Object.entries(doneResults).reduce((acc, [key, props]) => {
    // If a group key
    if (Object.keys(requestGroups).includes(key)) {
      Object.entries(requestTypes).forEach(([name, info]) => {
        if (info.tags.includes(key)) {
          acc[name] = { ...(acc[name] ?? {}), ...props };
        }
      });
    } else if (Object.keys(requestTypes).includes(key)) {
      acc[key] = { ...(acc[key] ?? {}), ...props };
    } else {
      throw new Error(`Invalid group name ${key} passed to doneResults`);
    }
    return acc;
  }, {});

  const testedOrder = Object.entries(testedResults ?? {}).reduce(
    (acc, [key, result]) => {
      // If a group key
      if (Object.keys(requestGroups).includes(key)) {
        Object.entries(requestTypes).forEach(([name, info]) => {
          if (info.tags.includes(key)) {
            // Do not overwrite
            acc[name] = acc[name] ?? result;
          }
        });
      } else if (Object.keys(requestTypes).includes(key)) {
        // Overwrite for main types
        acc[key] = result;
      } else {
        throw new Error(`Invalid group name ${key} passed to testedResults`);
      }
      return acc;
    },
    {}
  );

  // Iterate through requiredTypes
  const expectedEntries = requiredTypes.map((type) => {
    // Bind the id to message constructor
    const TMessage = function (...args) {
      const message = {
        ...new Message(messageId, ...args),
        ...(messageProps[type] ?? {}),
      };

      switch (message.state) {
        case state.done:
          return { ...message, ...(doneProps[type] ?? {}) };

        case state.testing:
        case state.tested:
          if (!message.testCase) {
            throw new Error(
              `Message of state ${message.state} is missing testCase prop`
            );
          }

          // Add subtask if exists
          if (subtaskDistribution) {
            return {
              ...message,
              subtask: subtaskDistribution[message.testCase - 1],
            };
          }
          return message;
        default:
          return message;
      }
    };

    const expected = [];
    if (!justExecutor) {
      expected.push(new TMessage(state.queuing));
    }

    // Cheeky IIFE
    (function () {
      // Handling compilation messages
      if (includeCompiled) {
        switch (type) {
          case 'compileError':
            expected.push(new TMessage(state.compiling));
            expected.push(new TMessage(state.compiled, { result: 'error' }));
            return;
          case 'compileSuccess':
            expected.push(new TMessage(state.compiling));
            expected.push(new TMessage(state.compiled, { result: 'success' }));
            return;
          default:
            expected.push(new TMessage(state.compiling));
            expected.push(new TMessage(state.compiled, { result: 'success' }));
        }
      }

      // Assign args from tested orders else from request type
      if (!testedOrder[type]) {
        const resultObject = (() => {
          switch (type) {
            case 'testAccepted':
              return {
                result: 'accepted',
                time: null,
                memory: null,
              };
            case 'testWrong':
              return {
                result: 'wrong',
              };
            case 'testError':
              return {
                result: 'error',
              };
            case 'testMLE':
              return {
                result: 'MLE',
              };
            case 'testTLE':
              return {
                result: 'TLE',
              };
            case 'testHang':
              return {
                result: 'TLE',
              };
            case 'compileError':
            case 'compileSuccess':
              throw new Error(
                `Cannot pass ${type} as a required type when 'includeCompiled' not true`
              );
            default:
              throw new Error(`Unrecognised request type ${type}`);
          }
        })();
        expected.push(
          ...Array.from(Array(problem.testCases).keys()).flatMap((testCase) => [
            new TMessage(state.testing, { testCase: testCase + 1 }),
            new TMessage(state.tested, {
              testCase: testCase + 1,
              ...resultObject,
            }),
          ])
        );
      } else {
        // Else follow testing order
        expected.push(
          ...Array.from(Array(problem.testCases).keys()).flatMap((testCase) => {
            const resultObject = { result: testedOrder[type][testCase] };
            if (
              !['accepted', 'wrong', 'MLE', 'TLE', 'error'].includes(
                resultObject.result
              )
            ) {
              throw new Error(
                `Invalid result ${resultObject.result} passed to testedResults`
              );
            }

            // Accepted is special case
            if (resultObject.result === 'accepted') {
              resultObject.time = null;
              resultObject.memory = null;
            }

            return [
              new TMessage(state.testing, { testCase: testCase + 1 }),
              new TMessage(state.tested, {
                testCase: testCase + 1,
                ...resultObject,
              }),
            ];
          })
        );
      }
    })();

    if (!justExecutor) {
      expected.push(new TMessage(state.done));
    }

    return [type, expected];
  });

  return Object.freeze(Object.fromEntries(expectedEntries));
}
