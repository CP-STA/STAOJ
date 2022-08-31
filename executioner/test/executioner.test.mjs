import test from 'ava';
import {
  repoPath,
  testProblem,
  testSubtasksFailProblem,
  testSubtasksMixedProblem,
  testSubtasksPassProblem,
} from './globals.mjs';
import { parseRequestsSync } from './request-parser.mjs';
import { getSupportedLanguagesSync } from '../src/utils/functions.mjs';
import { testInterfaceMacro } from './test-interface-macro.mjs';

const supportedLanguages = getSupportedLanguagesSync(repoPath);

// Required types and languages for these tests
const testingLanguages = Object.keys(supportedLanguages);
const testingProblems = [
  testProblem,
  testSubtasksPassProblem,
  testSubtasksFailProblem,
  testSubtasksMixedProblem,
];

// Create tests from requests
for (const problem of testingProblems) {
  const requests = parseRequestsSync(problem, testingLanguages);
  for (const language of testingLanguages) {
    for (const request of problem.testingRequestTypes) {
      // Skip compiled for non compiled languages
      if (
        (!supportedLanguages[language].compiled &&
          request === 'compileSuccess') ||
        request === 'compileError'
      ) {
        continue;
      }

      test(
        `Testing the ${problem.name} with ${request} for ${language}`,
        testInterfaceMacro,
        { ...requests[language][request], name: request },
        { ...supportedLanguages[language], name: language },
        problem
      );
    }
  }
}
