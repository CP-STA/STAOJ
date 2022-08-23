import { promises as fs } from 'fs';
import path from 'path';
import { inititaliseInterface } from './interface.mjs';
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

  const fileBaseName = 'Solution';
  const supportedLanugagesPath = path.join(
    repoPath,
    'problems',
    'supported-languages.json'
  );
  const languages = await fs
    .readFile(supportedLanugagesPath)
    .catch((e) => {
      logError(`Could not find languages file at ${supportedLanugagesPath}`);
    })
    .then((data) => data.toString())
    .then((file) => JSON.parse(file))
    .catch((e) => {
      logError(`Failed to parse JSON at ${supportedLanugagesPath}`);
    });

  try {
    const app = inititaliseInterface({
      databaseURL: 'staoj-database.firebaseio.com',
    });
    app.onSubmission((request) => {
      // Set filename becasue that is not set by the interface currently
      request.fileName = `${fileBaseName}.${
        languages[request.language].extension
      }`;

      function sendMessage(message) {
        console.log('Message received:', message.state, message.result);
      }

      try {
        pushRequest(repoPath, sendMessage, request);
      } catch (e) {
        logError(e, false);
      }
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
