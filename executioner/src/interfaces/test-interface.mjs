export function initTestInterface(options) {
  // storing the callbacks
  let handleSubmission;
  let handleMessageSent;

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
  return {
    onSubmission: (callback) => {
      handleSubmission = callback;
    },
    sendMessage: (message) => {
      // Destructure message and add server time
      const { id, ...dbMessage } = message;
      dbMessage.judgeTime = Date.now();
      executeCallback('onMessageSent', handleMessageSent, id, dbMessage);
    },
    // These methods exist for testing purposes specifically
    pushSubmission: (request) => {
      executeCallback('onSubmission', handleSubmission, request);
    },
    onMessageSent: (callback) => {
      handleMessageSent = callback;
    },
  };
}
