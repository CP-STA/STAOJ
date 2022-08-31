import _ from 'lodash';
import test from 'ava';
import {
  testProblem,
  testSubtasksFailProblem,
  testSubtasksMixedProblem,
  testSubtasksPassProblem,
} from './globals.mjs';
import { runExecutioner } from '../src/executioner.mjs';
import { generateExpectedMessages } from './expected-generator.mjs';
import path from 'path';
import { thisPath, filesFromRequests } from './globals.mjs';
import { TestFirestoreInterface } from '../src/interfaces/firestore-interface.mjs';

export const firestoreInterfaceMacro = test.macro(
  async (t, request, language, problem) => {
    const interfaceName = 'firestore_interface';
    const results = [];

    // Silence logging
    console.log = () => {};

    // Set test interface to push all messages to array
    const app = new TestFirestoreInterface({
      updateSubmissionField: (id, data) => {
        results.push(data);
      },
      addSubmissionResult: (id, data) => {
        results.push(data);
      },
    });

    await t.notThrowsAsync(
      runExecutioner(app, {
        problemDir: problem.dir,
        tmpRootPath: path.join(
          thisPath,
          'test',
          'tmp',
          interfaceName,
          problem.name
        ),
        overwriteTmpPath: true,
        baseFileName: filesFromRequests[request.name],
        checkPodman: false,
      })
    );

    // Push the request once executioner has accquinted itself
    app.pushSubmission(request);

    // Wait for the last message to send
    await app.submissionComplete();

    // Function to help generate test messages

    // Generating the expected messages
    // Starting with judging state always
    const expected = [{ state: 'judging' }];

    // Cheecky iife
    (() => {
      if (language.compiled) {
        expected.push({ state: 'compiling' });

        // Compile result
        if (request.name === 'compileError') {
          expected.push({ state: 'compileError' });
          expected.push({ score: 0 });
          return;
        } else {
          expected.push({ state: 'compiled' });
        }
      }

      const options = (() => {
        switch (problem) {
          case testProblem:
            return {
              additionalProperties: { [request.name]: { judgeTime: null } },
            };
          case testSubtasksPassProblem:
            return {
              additionalProperties: { [request.name]: { judgeTime: null } },
            };
          case testSubtasksMixedProblem:
            return {
              additionalProperties: { [request.name]: { judgeTime: null } },
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
            };
          case testSubtasksFailProblem:
            return {
              additionalProperties: { [request.name]: { judgeTime: null } },
              doneResults: {
                [request.name]: { score: 0, failedSubtasks: [1, 2, 3] },
              },
              testedResults: {
                testAccepted: new Array(problem.testCases).fill('wrong'),
              },
            };
        }
      })();

      expected.push(
        ...generateExpectedMessages([request.name], problem, {
          includeCompiled: false,
          justExecutor: true,
          noId: true,
          ...options,
        })[request.name]
      );

      switch (problem) {
        case testProblem:
          expected.push({ score: null });
          break;
        case testSubtasksPassProblem:
          if (request.name === 'testAccepted') {
            expected.push({ score: 1 });
            expected.push({ failedSubtasks: [] });
          } else {
            expected.push({ score: 0 });
            expected.push({ failedSubtasks: [1, 2, 3] });
          }
          break;
        case testSubtasksMixedProblem:
          if (request.name === 'testAccepted') {
            expected.push({ score: 0.3 });
            expected.push({ failedSubtasks: [2, 3] });
          } else {
            expected.push({ score: 0 });
            expected.push({ failedSubtasks: [1, 2, 3, 4] });
          }
          break;
        case testSubtasksFailProblem:
          expected.push({ score: 0 });
          expected.push({ failedSubtasks: [1, 2, 3] });
          break;
      }

      // Final result if not already exitted
      expected.push({ state: 'judged' });
    })();

    const testResult = await t.try('Checking the received state', (tt) => {
      for (const [s, result] of Object.entries(results)) {
        const i = parseInt(s);
        const exp = expected[i];
        if (
          !tt.not(
            exp,
            undefined,
            'Execution returned more results than expected'
          )
        ) {
          tt.log(`${JSON.stringify(result)} is still left`);
          return;
        }

        // Check that the keys are the same
        const resultKeys = Object.keys(result);
        const expKeys = Object.keys(exp);
        if (
          !tt.deepEqual(
            resultKeys.sort(),
            expKeys.sort(),
            'The result and expected have different keys'
          )
        ) {
          // Printing the differences
          tt.log(`Result ${i + 1} has different keys than expected`);

          const shared = _.intersectionWith(resultKeys, expKeys, _.isEqual);
          const missing = _.differenceWith(expKeys, shared, _.isEqual);
          const additional = _.differenceWith(resultKeys, shared, _.isEqual);

          missing.length !== 0 && tt.log(` - Missing ${missing}`);
          additional.length !== 0 &&
            tt.log(` - Unexpectedly has ${additional}`);
        }

        // Check that the values are the same
        const filteredExp = Object.entries(exp).filter(
          ([, value]) => value !== null
        );

        if (
          !tt.true(
            filteredExp.every(([key, value]) => _.isEqual(result[key], value)),
            'The result and expected have different values'
          )
        ) {
          tt.log(`Result ${i + 1} has different values than expected`);

          const filteredResults = Object.entries(result).filter(
            ([key]) => exp[key] !== null
          );
          const shared = _.intersectionWith(
            filteredExp,
            filteredResults,
            _.isEqual
          );
          const differences = _.differenceWith(
            filteredResults,
            shared,
            _.isEqual
          ).map(([key, v1]) => [key, v1, filteredExp[key]]);

          const differencesString = differences.reduce(
            (str, [key, v1, v2]) =>
              v2 !== null ? str + ` {${key}: ${v2} but got ${v1}}` : str,
            ''
          );

          tt.log(` -${differencesString}`);
        }
      }
      if (
        !tt.is(
          results.length,
          expected.length,
          'More expected than results returned'
        )
      ) {
        tt.log('Expected still has', expected.slice(results.length));
        tt.log("Results' last three results were", results.slice(-3));
      }
    });
    testResult.commit({ retainLogs: true });

    t.pass();
  }
);
