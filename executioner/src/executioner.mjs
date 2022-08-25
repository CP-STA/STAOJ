import { inititaliseInterface } from './interfaces/firestore-interface.mjs';
import { pushRequest } from './queuer.mjs';

async function runExecutioner() {
  function logError(message, exit = true) {
    console.error('Error:', message);
    exit && process.exit(1);
  }

  // Assigning the environmental variables
  const repoPath = process.env.REPO_PATH;

  if (repoPath === undefined) {
    logError('REPO_PATH is undefined');
  }

  try {
    console.log('Connecting to database...');
    const app = await inititaliseInterface({
      databaseURL: 'staoj-database.firebaseio.com',
    });
    console.log('Connected to database');
    console.log('Listening for new submissions...');
    app.onSubmission((request) => {
      // Wrapper send message function
      function sendMessage(message) {
        console.log(`${message.id}:`, message.state);

        // If state is error then mark as error an do nothing else
        if (message.state == 'error') {
          app.errorWithSubmission(message.id);
          return;
        }
        if (message.state == 'done') {
          app.completeSubmission(message.id);
          return;
        }

        // Else send message
        app.sendMessage(message);
      }

      pushRequest(repoPath, sendMessage, request);
    });
  } catch (e) {
    logError(e);
  }
}

runExecutioner();

// Exposing the program entry point to testing
if (process.env.NODE_ENV === 'test') {
  exports.runExecutioner = runExecutioner;
}
