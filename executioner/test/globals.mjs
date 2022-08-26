import path from 'path'


// Contains any general const of functions shared between tests

export const testProblem = Object.freeze({
  name: 'test-base',
  dir: 'problems-private',
  testCases: 3,
  maxMem: 128000,
  maxTime: 3000,
});

// Enum of possible request types
export const requestTypes = Object.freeze({
  compileError: 'compileError',
  compileSuccess: 'compileSuccess',
  testAccepted: 'testAccepted',
  testWrong: 'testWrong',
  testError: 'testError',
  testMle: 'testMle',
  testTle: 'testTle',
  testHang: 'testHang',
});

// Specifying the file names for each request type when testing
export const filesFromRequests = Object.freeze({
  [requestTypes.compileError]: 'compile_error',
  [requestTypes.compileSuccess]: 'compile_success',
  [requestTypes.testAccepted]: 'test_accepted',
  [requestTypes.testWrong]: 'test_wrong',
  [requestTypes.testError]: 'test_error',
  [requestTypes.testMle]: 'test_mle',
  [requestTypes.testTle]: 'test_tle',
  [requestTypes.testHang]: 'test_hang',
});

// Paths
export const repoPath = path.resolve('../');
export const thisPath = path.resolve('.');
export const sampleSourceCodePath = path.join(thisPath, 'test', 'sample-submissions');
export const tmpRootPath = path.join(thisPath, 'test', 'tmp')

// Demoter consts
export const mleString = 'Out of memory!';
export const tleString = 'Out of time!';

