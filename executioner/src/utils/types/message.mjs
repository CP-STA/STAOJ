// State enum
export const state = Object.freeze({
  queuing: 'queuing', // Always sent when the executioner handles a submission
  compiling: 'compiling', // Compiling the submission code if neccessary
  compiled: 'compiled', // Compiling code finished
  testing: 'testing', // Testing test case on code
  tested: 'tested', // Test case tested on code
  done: 'done', // Execution finished
  error: 'error', // Executioner's fault, submission possibly recoverable
  invalid: 'invalid', // Frontend's fault, probably not recoverable
  // Submissions should always end in one of these last three states
});

// Message constructor
export function Message(uuid, state, props) {
  // Setting main props if defined
  if (uuid !== undefined) {
    this.id = uuid;
  }
  if (state !== undefined) {
    this.state = state;
  }
  // Adding additonal props to the message if any passed
  if (props !== undefined) {
    for (let prop in props) {
      if (props.hasOwnProperty(prop)) {
        this[prop] = props[prop];
      }
    }
  }
}
