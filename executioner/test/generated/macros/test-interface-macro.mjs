import { TestInterface } from '../../../src/interfaces/test-interface.mjs';
import test from 'ava';
import {
  testProblem,
  testSubtasksFailProblem,
  testSubtasksMixedProblem,
  testSubtasksPassProblem,
} from '../../globals.mjs';
import { runExecutioner } from '../../../src/executioner.mjs';
import { generateExpectedMessages } from '../expected-generator.mjs';
import { checkMessages } from './macros.mjs';
import path from 'path';
import { thisPath, filesFromRequests } from '../../globals.mjs';

export const testInterfaceMacro = test.macro(
  async (t, request, language, problem) => {
    const interfaceName = 'test_interface';
    const messages = [];

    // Silence logging
    console.log = () => {};

    // Set test interface to push all messages to array
    const app = new TestInterface({
      handleMessageSent: (message) => messages.push(message),
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

    const options = (() => {
      switch (problem) {
        case testProblem:
          return {
            additionalProperties: { [request.name]: { judgeTime: null } },
            doneResults: { [request.name]: { score: null } },
          };
        case testSubtasksPassProblem:
          return {
            additionalProperties: { [request.name]: { judgeTime: null } },
            doneResults: {
              testAccepted: { score: 1, failedSubtasks: [] },
              testError: { score: 0, failedSubtasks: [1, 2, 3] },
            },
          };
        case testSubtasksMixedProblem:
          return {
            additionalProperties: { [request.name]: { judgeTime: null } },
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
          };
        case testSubtasksFailProblem:
          return {
            additionalProperties: { [request.name]: { judgeTime: null } },
            doneResults: {
              testAccepted: { score: 0, failedSubtasks: [1, 2, 3] },
              testError: { score: 0, failedSubtasks: [1, 2, 3] },
            },
            testedResults: {
              testAccepted: new Array(problem.testCases).fill('wrong'),
            },
          };
      }
    })();

    // I designed the generateExpectedMessages function to be much more bulky and powerful
    // Perhaps split it into two functions, one for individual requests
    // The latter built of the individual to handle multiple like it is now
    // However, I do appreciate the flexibility of the options passed also
    const expected = generateExpectedMessages([request.name], problem, {
      includeCompiled: language.compiled,
      justExecutor: false,
      ...options,
    })[request.name];

    const testResult = await t.try(
      'Checking the received messages',
      checkMessages,
      expected,
      messages
    );
    testResult.commit({ retainLogs: true });

    t.pass();
  }
);
