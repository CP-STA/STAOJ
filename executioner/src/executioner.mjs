import path from 'path';
import { execute } from './executor.mjs';
import { Message, state } from './utils/types/message.mjs';
import { InvalidDataError } from './utils/types/errors.mjs';
import {
  isContainerImageBuilt,
  getContainerCount,
} from './utils/functions.mjs';

// For logging errors neatly
function logError(error) {
  console.error(error);
}

export async function runExecutioner(app, options) {
  const checkPodman = options.checkPodman ?? true;

  if (checkPodman) {
    // Some checks with podman
    // Make sure image is built
    if (!(await isContainerImageBuilt('executioner'))) {
      throw 'Container image is not built, please run `npm install`';
    }

    // Make sure there aren't too many containers made
    if ((await getContainerCount()) > 2000) {
      throw 'Podman currently has stored over 1000 containers and will soon fail at 2048, try running `podman rmi --all --force`';
    }
  }

  const repoPath = path.resolve('../');

  console.log('Listening for new submissions...');
  app.onSubmission((request) => {
    // Wrapper send message function to log stuff
    function sendMessage(message) {
      console.log(`${message.id}:`, message.state);
      app.sendMessage(message);
    }

    pushRequest(repoPath, sendMessage, request, options).catch(logError);
  });

  // Queue state
  const limit = 1;
  const queuedRequests = [];
  let executingCount = 0;

  // For queueing submissions
  async function pushRequest(repoPath, sendMessage, request, options) {
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
        const result = await execute(repoPath, sendMessage, request, options);

        // Undefined score with no error means compilation error so no done message
        if (result.score !== undefined) {
          // If finished without error then complete with done message
          sendMessage(new Message(request.id, state.done, result));
        }
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
}
