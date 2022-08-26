import { initFirestoreInterface } from './interfaces/firestore-interface.mjs';
import { initTestInterface } from './interfaces/test-interface.mjs';
import { pushRequest } from './queuer.mjs';
import { Request } from './request.mjs';
import path from 'path'

// For logging errors neatly
function logError(message, exit = true) {
  console.error('Error:', message);
  exit && process.exit(1);
}

export async function runExecutioner(app) {

  const repoPath = path.resolve('../')

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

    pushRequest(repoPath, sendMessage, request).catch(logError);
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

app.onStateChange((id, state) => { console.log(id, `state changed to ${state}`)})
app.onMessageSent((id, message) => { console.log(id, `message received ${message.state}`)})

runExecutioner(app).catch((e) => { console.error(e) })
setTimeout(() => {
  app.pushSubmission(new Request('hello', 'reverse-string', 'null', 'gpp-11.3'));
}, 1000)
*/
