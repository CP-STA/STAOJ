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

export async function runExecutioner(
  app,
  { checkPodman = true, executingLimit = 1, cleanUp = true, ...options }
) {
  if (checkPodman) {
    // Some checks with podman
    // Make sure image is built
    if (!(await isContainerImageBuilt('executioner'))) {
      throw 'Container image is not built, please run `npm install`';
    }

    // Make sure there aren't too many containers made
    if ((await getContainerCount()) > 2000) {
      throw 'Podman currently has stored over 1000 containers and will soon fail at 2048, try running `podman container rm --all --force`';
    }
  }

  // Variables for shutting down
  let shuttingDown = false;
  const executingRequests = [];

  // Cleanup function on exit for executioner
  if (cleanUp) {
    async function onCleanup(code = 0) {
      console.log('\nCleaning up...');
      shuttingDown = true;
      const count = executingRequests.length;
      console.log(
        `Awaiting ${count} request${count !== 1 ? 's' : ''} to finish`
      );
      await app.deactivate();
      await Promise.all(executingRequests.map(app.submissionComplete));
      // Workaround for executioner not finishing scoring
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
      console.log('Goodbye');
      process.exit(code);
    }

    // All the main exit signals
    process.on('SIGINT', onCleanup);
    process.on('SIGTERM', onCleanup);
    process.on('SIGUSR1', onCleanup);
    process.on('SIGUSR2', onCleanup);
    process.on('uncaughtException', (e) => {
      console.error('Uncaught exception in executioner:');
      console.error(e);
      onCleanup(1);
    });
  }

  // Wrapper send message function to log stuff
  async function sendMessage(message) {
    console.log(`${message.id}:`, `Sending ${message.state}`, message.state === 'testing' ? message.testCase : '');
    const result = await app.sendMessage(message);
    if (!result) {
      console.log(
        `${message.id}:`,
        `Did not send ${message.state} (already taken)`
      );
    }
    return result;
  }

  const repoPath = path.resolve('../');

  console.log('Listening for new submissions...');
  app.onSubmission((request) => {
    // Don't handle submissions whilt shutting down
    if (shuttingDown) {
      return;
    }

    console.log('---', 'New submisison:', request.id, '---');

    try {
      pushRequest(repoPath, sendMessage, request, options);
    } catch (e) {
      logError(e);
    }
  });

  // Queue state
  const queuedRequests = [];
  let executingCount = 0;

  // For queueing submissions
  function pushRequest(repoPath, sendMessage, request, options) {
    if (request === undefined) {
      throw new InvalidDataError('Pushed request is undefined');
    }

    // Wrapper to handle passing the right args to execution and handling promise result
    // I'm worried that this might actually be recursion and possibly cause overhead over time
    async function handleExecution(request) {
      if (request === undefined || shuttingDown) {
        executingCount--;
        return false;
      }
      // If queued successfully then continue with execution
      // Otherwise, the request is probably already handled elsewhere
      // This prevents ugly race conditions
      if (!(await sendMessage(new Message(request.id, state.executing)))) {
        // Regardless, run the next queued request if any
        handleExecution(queuedRequests.shift());
        return false;
      }

      try {
        executingRequests.push(request.id);
        const result = await execute(repoPath, sendMessage, request, { ...options, diffProcessGroup: cleanUp });
        await sendMessage(new Message(request.id, state.done, result));
      } catch (e) {
        // If error then identify type and let it propogate
        if (e instanceof InvalidDataError) {
          await sendMessage(new Message(request.id, state.invalid));
        } else {
          await sendMessage(new Message(request.id, state.error));
        }
        console.error(e);
      } finally {
        // Regardless, run the next queued request if any
        const it = executingRequests.indexOf(request.id);
        if (it !== -1) {
          executingRequests.splice(it, 1);
        }
        handleExecution(queuedRequests.shift());
      }
      return true;
    }

    // Run or queue depending on if slot open
    if (executingCount < executingLimit) {
      executingCount++;
      handleExecution(request);
    } else {
      queuedRequests.push(request);
    }
  }
}
