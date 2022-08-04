import * as socketInterface from './socketInterface.mjs';
import { Request } from './request.mjs';
import { execute } from './executor.mjs';
import { Message, state } from './message.mjs';

/*
- Message is parsed and if is to executioner then manager handles it
- Manager places request in queue 
- If enough cpu available, begin execution of request
- Manager should be able to run multiple requests at a time
  so long as each request is allocated the same cpu power
- For now, only execute a request one at a time to start things simple
- Upon request completion, execute next in queue if any and so on
*/

// Address
const here = 'executioner';

// Assigning the environmental variables
const repoPath = process.env.REPO_PATH;
const sockPath = process.env.EXER_SOCKET;

if (repoPath == null) {
  console.error('REPO_PATH is undefined');
  process.exit(1);
}
if (sockPath == null) {
  console.error('EXER_SOCKET is undefined');
  process.exit(1);
}

// Keeping track of queued and executing requests
let executingCount = 0;
let queuedRequests = [];

// Initialise socket path and receiver function
try {
  // Connect to sokcet
  socketInterface.connectSocket(sockPath);
  console.log('Connected to socket');
} catch (e) {
  console.error(`ERROR: Could not connect to socket at socket path\n${e}`);
  process.exit(1);
}

// Set on message receive callback
socketInterface.setReceiverCallback((message) => {
  // If its not addressed to here then ignore
  if (message.to !== here) {
    return;
  }

  console.log(`Request ${message.id} received`);
  socketInterface.sendMessage(new Message(message.id, state.queuing));

  // Add request to queue
  queuedRequests.push(
    new Request(
      message.id,
      message.problem,
      message.source_code_file_name,
      message.source_code_content,
      message.language
    )
  );

  // Wrapper to handle passing the right args to execution and handling promise result
  function handleExecution(request) {
    if (request !== undefined) {
      // I'm like 90% sure this isn't an infinite recursion, or a recursion at all
      // The function could possibly be called continously in a loop yet the calls shouldn't be nested (which could lead to stack overflow)
      executingCount++;
      execute(repoPath, socketInterface.sendMessage, request)
        .catch((e) => {
          console.error(
            `ERROR: error occured during execution of ${message.id}\n${e}`
          );
        })
        .finally(() => {
          // Regardless of errors, gotta tell the server execution is done for consistency and continue
          socketInterface.sendMessage(new Message(message.id, state.done));

          // If didn't handle next execution, reduce executing count
          handleExecution(queuedRequests.shift()) || executingCount--;
        });

      return true;
    } else {
      return false;
    }
  }

  // If less then neccessary executing then execute else wait for program to finish executing and run next in queue
  // For now only take requests 1 at a time
  if (executingCount < 1) {
    handleExecution(queuedRequests.shift());
  }
});
