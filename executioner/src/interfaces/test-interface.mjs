export function TestInterface({ handleMessageSent }) {
  if (typeof handleMessageSent !== 'function') {
    throw new Error('handleMessageSent callback not set in interface options');
  }

  // storing the callbacks
  let handleSubmission;
  let handleCompletionDefault;
  const handleCompletions = [];

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
  this.isActive = function () {
    return true;
  };
  this.deactivate = async function () {
    // Do nothing
  };
  this.onSubmission = function (callback) {
    handleSubmission = callback;
  };
  this.sendMessage = function (message) {
    // Destructure message and add server time
    message.judgeTime = Date.now();
    handleMessageSent(message);
    if (message.state === 'done') {
      // handle completion or don't, not required
      if (handleCompletions[message.id]) {
        handleCompletions[message.id]();
      } else if (handleCompletionDefault) {
        handleCompletionDefault();
      }
    }
    return true;
  };
  // These methods exist for testing purposes specifically
  this.pushSubmission = function (request) {
    executeCallback('onSubmission', handleSubmission, request);
  };
  // For testing one time submissions
  this.submissionComplete = function (id = null) {
    return new Promise((resolve) => {
      if (id === null) {
        handleCompletionDefault = resolve;
      } else {
        handleCompletions[id] = resolve;
      }
    });
  };
}
