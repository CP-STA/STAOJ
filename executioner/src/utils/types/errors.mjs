// The data passed to the executioner is incorrect or unusable
export class InvalidDataError extends Error {
  constructor(message) {
    super(message);

    // Remove constructor from stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidDataError);
    }
    this.name = 'InvalidDataError';
  }
}
