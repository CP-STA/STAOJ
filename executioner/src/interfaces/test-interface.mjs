export function initTestInterface(options) {
  // storing the callbacks
  let handleSubmission;
  let handleMessageSent;
  let handleStateChange;

  // Cheeky little function that checks that a callback exists before calling
  // Else complain nicely
  function executeCallback(setBy, callback, ...args) {
    if (typeof callback === 'function') {
      callback(...args);
    } else {
      throw `No ${setBy} callback set`;
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
      executeCallback('onMessageSent', handleMessageSent, id, dbMessage);
    },
    completeSubmission: (id) => {
      executeCallback('onStateChange', handleStateChange, id, 'judged');
    },
    errorWithSubmission: (id) => {
      executeCallback('onStateChange', handleStateChange, id, 'error');
    },
    // These methods exist for testing purposes specifically
    pushSubmission: (request) => {
      executeCallback('onSubmission', handleSubmission, request);
    },
    onMessageSent: (callback) => {
      handleMessageSent = callback;
    },
    onStateChange: (callback) => {
      handleStateChange = callback;
    },
  };
}
