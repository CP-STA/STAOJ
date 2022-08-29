import path from 'path';

// Contains any general constansts used across tests

export const testProblem = Object.freeze({
  name: 'test-base',
  dir: 'problems-private',
  testCases: 3,
  maxMem: 128000,
  maxTime: 3000,
});
export const testSubtasksPassProblem = Object.freeze({
  name: 'test-subtasks-pass',
  dir: 'problems-private',
  get testCases() {
    return this.subtasks.reduce((sum, t) => sum + t, 0);
  },
  subtasks: [3, 2, 1],
  maxMem: 128000,
  maxTime: 3000,
});
export const testSubtasksFailProblem = Object.freeze({
  name: 'test-subtasks-fail',
  dir: 'problems-private',
  get testCases() {
    return this.subtasks.reduce((sum, t) => sum + t, 0);
  },
  subtasks: [3, 2, 1],
  maxMem: 128000,
  maxTime: 3000,
});
export const testSubtasksMixedProblem = Object.freeze({
  name: 'test-subtasks-mixed',
  dir: 'problems-private',
  get testCases() {
    return this.subtasks.reduce((sum, t) => sum + t, 0);
  },
  subtasks: [3, 2, 2, 1],
  maxMem: 128000,
  maxTime: 3000,
});

export const requestGroups = Object.freeze({
  compileAll: 'compileAll',
  testAll: 'testAll',
  all: 'all',
  testErrorAll: 'testErrorAll',
  testNoErrorAll: 'testNoErrorAll',
  errorAll: 'errorAll',
  successAll: 'successAll',
});

// Enum of possible request types
export const requestTypes = Object.freeze({
  compileError: {
    tags: [requestGroups.all, requestGroups.compileAll, requestGroups.errorAll],
  },
  compileSuccess: {
    tags: [
      requestGroups.all,
      requestGroups.compileAll,
      requestGroups.successAll,
    ],
  },
  testAccepted: {
    tags: [
      requestGroups.all,
      requestGroups.testAll,
      requestGroups.successAll,
      requestGroups.testNoErrorAll,
    ],
  },
  testWrong: {
    tags: [
      requestGroups.all,
      requestGroups.testAll,
      requestGroups.testNoErrorAll,
    ],
  },
  testError: {
    tags: [
      requestGroups.all,
      requestGroups.testAll,
      requestGroups.testErrorAll,
      requestGroups.errorAll,
    ],
  },
  testMLE: {
    tags: [
      requestGroups.all,
      requestGroups.testAll,
      requestGroups.testErrorAll,
      requestGroups.errorAll,
    ],
  },
  testTLE: {
    tags: [
      requestGroups.all,
      requestGroups.testAll,
      requestGroups.testErrorAll,
      requestGroups.errorAll,
    ],
  },
  testHang: {
    tags: [
      requestGroups.all,
      requestGroups.testAll,
      requestGroups.testErrorAll,
      requestGroups.errorAll,
    ],
  },
});

export function getRequestNamesByGroup(...groups) {
  return Object.entries(requestTypes)
    .filter(([_, info]) => groups.some((group) => info.tags.includes(group)))
    .map(([name, _]) => name);
}

// Specifying the file names for each request type when testing
export const filesFromRequests = Object.freeze({
  compileError: 'compile_error',
  compileSuccess: 'compile_success',
  testAccepted: 'test_accepted',
  testWrong: 'test_wrong',
  testError: 'test_error',
  testMLE: 'test_mle',
  testTLE: 'test_tle',
  testHang: 'test_hang',
});

// Paths
export const repoPath = path.resolve('../');
export const thisPath = path.resolve('.');
export const sampleSourceCodePath = path.join(
  thisPath,
  'test',
  'sample-submissions'
);
export const tmpRootPath = path.join(thisPath, 'test', 'tmp');

// Demoter consts
export const mleString = 'Out of memory!';
export const tleString = 'Out of time!';
