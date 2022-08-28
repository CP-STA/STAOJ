import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Request } from '../utils/types/request.mjs';

export function FirestoreInterface(options) {
  const databaseURL =
    options.databaseURL ||
    (() => {
      throw new Error('Need to pass `databaseURL` to interface options');
    })();
  const readOld = options.readOld || false;
  const submissionsCollectionPath =
    options.submissionsCollectionPath || 'submissions';

  // Assert that the neccessary env variable is set to connect to db
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
    throw new Error(
      'The GOOGLE_APPLICATION_CREDENTIALS environmental variable must be set to the path of the database key file'
    );
  }

  // connect to cloud and ensure is connected
  const app = initializeApp({
    credential: applicationDefault(),
    databaseURL,
  });
  const db = getFirestore(app);
  const submissions = db.collection(submissionsCollectionPath);

  try {
  } catch (e) {
    throw new Error(`Unable to connect to database:\n${e}`);
  }

  let readOldYet = false;

  // Return interface object which allows assignment of onSubmission handler
  this.isActive = async function () {
    try {
      await submissions.get();
      return true;
    } catch {
      return false;
    }
  };
  (this.onSubmission = function (handleSubmission) {
    submissions.where('state', '==', 'queued').onSnapshot((snapshot) => {
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

          console.log('New submission:', id, '\n', rawSubmission, id);

          // File names no longer stored, so cannot be read, so they must be
          // set later or removed from request in future
          const newRequest = new Request(id, problem, sourceCode, language);

          handleSubmission(newRequest);
        }
      });
    });
  }),
    (this.sendMessage = function (message) {
      // Destructure message and add server time
      const { id, ...data } = message;
      data.judgeTime = Date.now();

      const updateSubmissonState = (state) => {
        submissions.doc(id).update({ state });
      };

      // If state is error then mark as error an do nothing else
      switch (data.state) {
        case 'queuing':
          // Need to change this later to support multiple executioners and
          // prevent nasty race conditions
          updateSubmissonState('judging');
          return;
        case 'compiling':
          updateSubmissonState('compiling');
          return;
        case 'compiled':
          if (data.result === 'success') {
            updateSubmissonState('compiled');
          } else if (data.result === 'error') {
            // Compilation error is an endstate so 0 becomes score
            updateSubmissonState('compileError');
            submissions.doc(id).update({ score: 0 });
          } else {
            throw new Error(
              `Unexpected result: ${data.result} received from compiled message`
            );
          }
          return;
        case 'done':
          updateSubmissonState('judged');
          submissions.doc(id).update({ score: data.score });
          data.failedSubtasks &&
            submissions.doc(id).update({ failedSubtasks: data.failedSubtasks });
          return;
        case 'error':
          updateSubmissonState('error');
          return;
        case 'invalid':
          updateSubmissonState('invalidData');
          return;
      }
      // Otherwise add as judge result
      submissions.doc(id).collection('judge-results').add(data);
    });
}
