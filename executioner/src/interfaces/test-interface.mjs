export function TestInterface(options) {
  // storing the callbacks
  let handleSubmission;
  let handleMessageSent;
  let handleCompletion;

  // Cheeky little function that checks that a callback exists before calling
  // Else complain nicely
  function executeCallback(setBy, callback, ...args) {
    if (typeof callback === 'function') {
      callback(...args);
    } else {
      throw new Error(`No ${setBy} callback set`);
    }
  }

  // Return interface object which allows assignment of onSubmission handler
  this.isActive = function () { return true }
  this.onSubmission = function (callback) {
    handleSubmission = callback;
  }
  this.sendMessage = function (message) {
    // Destructure message and add server time
    message.judgeTime = Date.now();
    executeCallback('onMessageSent', handleMessageSent, message);
    if (message.state === 'done') {
      // handle completion or don't, not required
      handleCompletion && handleCompletion()
    }
  }
  // These methods exist for testing purposes specifically
  this.pushSubmission = function (request) {
    executeCallback('onSubmission', handleSubmission, request);
  }
  this.onMessageSent = (callback) => {
    handleMessageSent = callback;
  }
  // For testing one time submissions
  this.submissionComplete = function () {
    return new Promise ((resolve) => {
    handleCompletion = resolve;
  })
  };
}
