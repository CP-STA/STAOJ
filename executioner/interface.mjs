import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Request } from './request.mjs';

export async function inititaliseInterface(options) {
  const databaseURL =
    options.databaseURL ||
    (() => {
      throw 'Need to pass `databaseURL` to interface options';
    })();
  const readOld = options.readOld || false;
  const submissionsCollectionPath =
    options.submissionsCollectionPath || 'submissions';

  // Assert that the neccessary env variable is set to connect to db
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
    throw 'The GOOGLE_APPLICATION_CREDENTIALS environmental variable must be set to the path of the database key file'
  }

  // connect to cloud and ensure is connected
  const app = initializeApp({
    credential: applicationDefault(),
    databaseURL,
  });
  const db = getFirestore(app);
  const submissions = db.collection(submissionsCollectionPath)

  try {
    await submissions.get()
  } catch (e) {
    throw `Unable to connect to database:\n${e}`
  }

  let readOldYet = false;

  // Return interface object which allows assignment of onSubmission handler
  return {
    onSubmission: (handleSubmission) => {
      submissions
        .where('judged', '==', false)
        .where('error', '==', false)
        .onSnapshot((snapshot) => {
        // Skip the first if not readOld and trigger flag to read rest
        if (!readOld && !readOldYet) {
          readOldYet = true;
          return;
        }
        // Iterate through changes
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const rawSubmission = change.doc.data();

            // Get request data
            const id = change.doc.id;
            const { problem, language, sourceCode } = rawSubmission;

            console.log('New:', rawSubmission, id);

            // File names no longer stored, so cannot be read, so they must be
            // set later or removed from request in future
            const newRequest = new Request(
              id,
              problem,
              undefined,
              sourceCode,
              language
            );

            handleSubmission(newRequest);
          }
        });
      });
    },
    sendMessage: (message) => {
      const { id, ...dbMessage } = message
      submissions.doc(id).collection('judge-result').add(dbMessage);
    },
    completeSubmission: (id) => {
      submissions.doc(id).update({judged: true})
    },
    errorWithSubmission: (id) => {
      submissions.doc(id).update({error: true})
    }
  };
}
