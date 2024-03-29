import { runExecutioner } from './executioner.mjs';
import path from 'path';
import { FirestoreInterface } from './interfaces/firestore-interface.mjs';

// --- Starts here ---

export function start() {
  const thisPath = path.resolve('./');
  console.log('Connecting to database...');
  try {
    const app = new FirestoreInterface({
      databaseURL: 'staoj-database.firebaseio.com',
      readOld: true,
    });
    const executingLimit = parseInt(process.env.EXECUTING_LIMIT) || 1;
    app
      .isActive()
      .then((isActive) => {
        if (isActive) {
          console.log('Connected to database');
          return runExecutioner(app, {
            problemDir: 'problems-private',
            tmpRootPath: path.join(thisPath, 'tmp'),
            overwriteTmpPath: true,
            syncMessages: false,
            executingLimit,
            //debug: true,
          });
        } else {
          throw 'Failed to connect to database';
        }
      })
      .catch((e) => {
        // Ensures smooth cleanup
        console.error(e);
        process.emit('SIGINT', 1);
      });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
