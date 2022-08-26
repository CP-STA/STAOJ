import { initFirestoreInterface } from './interfaces/firestore-interface.mjs';
import { initTestInterface } from './interfaces/test-interface.mjs';
import { pushRequest } from './queuer.mjs';
import { Request } from './utils/types/request.mjs';
import path from 'path';

// For logging errors neatly
function logError(message, exit = true) {
  console.error('Error:', message);
  exit && process.exit(1);
}

export async function runExecutioner(app) {
  const repoPath = path.resolve('../');
  const thisPath = path.resolve('./');

  console.log('Listening for new submissions...');
  app.onSubmission((request) => {
    // Wrapper send message function to log stuff
    function sendMessage(message) {
      console.log(`${message.id}:`, message.state);
      app.sendMessage(message);
    }

    pushRequest(repoPath, sendMessage, request, {
        problemDir: 'problems-private',
        tmpRootPath: path.join(thisPath, 'tmp'),
        overwriteTmpPath: true,
      }).catch(logError);
  });
}

// --- Starts here ---

console.log('Connecting to database...');

initFirestoreInterface({
  databaseURL: 'staoj-database.firebaseio.com',
})
  .catch((e) => {
    logError(e);
  })
  .then((app) => {
    console.log('Connected to database');
    return runExecutioner(app);
  });

/*
const app = initTestInterface();

app.onMessageSent((id, message) => { console.log(id, `message received ${message.state}`)})

runExecutioner(app).catch((e) => { console.error(e) })
setTimeout(() => {
  app.pushSubmission(new Request('hello', 'reverse-string', 'null', 'gpp-11.3'));
}, 1000)
*/
