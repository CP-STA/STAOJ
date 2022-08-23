import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Request } from './request.mjs';

export function inititaliseInterface(options) {
  const databaseURL =
    options.databaseURL ||
    (() => {
      throw 'Need to pass `databaseURL` to options';
    })();
  const readOld = options.readOld || false;
  const submissionsCollectionPath =
    options.submissionsCollectionPath || 'submissions';

  const app = initializeApp({
    credential: applicationDefault(),
    databaseURL,
  });
  const db = getFirestore(app);
  const submissions = db
    .collection(submissionsCollectionPath)
    .where('judged', '==', false);
  let readOldYet = false;

  // Return interface object which allows assignment of onSubmission handler
  return {
    onSubmission: (handleSubmission) => {
      submissions.onSnapshot((snapshot) => {
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
    send: (message) => {},
  };
}
