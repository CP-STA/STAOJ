import { execute } from './executor.mjs';
import { Message, state } from './utils/types/message.mjs';
import { InvalidDataError } from './utils/types/errors.mjs'

const limit = 1;
const queuedRequests = [];
let executingCount = 0;

/**
 * Manages request in a single synchronous queue. Limits the number of
 * concurrently executed requests to some const limit. On pushing a request, if
 * there is less requests executing than the limit, then the request is
 * instantly executed, else it is queued and run once a request has finished
 * execution
 *
 * @param repoPath Path of the parent repository
 * @param sendMessage Callback used to send Messages
 * @param request The Request to execute or queue
 * @param options Options passed directly to the executor
 */
export async function pushRequest(repoPath, sendMessage, request, options) {
  if (request === undefined) {
    throw new InvalidDataError('Pushed request is undefined');
  }

    sendMessage(new Message(request.id, state.queuing));

  // Wrapper to handle passing the right args to execution and handling promise result
  // I'm worried that this might actually be recursion and possibly cause overhead over time
  async function handleExecution(request) {
    if (request === undefined) {
      return false;
    }

    executingCount++;
    try {
      await execute(repoPath, sendMessage, request, options);

      // If finished without error then complete with done message
      sendMessage(new Message(request.id, state.done));
    } catch (e) {
      // If error then identify type and let it propogate
      if (e instanceof InvalidDataError) {
        sendMessage(new Message(request.id, state.invalid));
      } else {
        sendMessage(new Message(request.id, state.error));
      }
      throw e;
    } finally {
      // Regardless, run the next queued request if any
      handleExecution(queuedRequests.shift()).then((executed) => {
        executed || executingCount--;
      });
    }
    return true;
  }

  // Run or queue depending on if slot open
  if (executingCount < limit) {
    await handleExecution(request);
  } else {
    queuedRequests.push(request);
  }
}
