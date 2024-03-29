import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { state } from '../utils/types/message.mjs';
import { Request } from '../utils/types/request.mjs';

// Executioner interface for firestore
export function FirestoreInterface({
  databaseURL,
  readOld = false,
  submissionsCollectionPath = 'submissions',
  submissionsJudgeResultPath = 'judge-results',
  infoPath = 'info',
}) {
  try {
    if (!databaseURL) {
      throw new Error('Need to pass `databaseURL` to interface options');
    }

    // Assert that the neccessary env variable is set to connect to db
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
      throw new Error(
        'The GOOGLE_APPLICATION_CREDENTIALS environmental variable must be set to the path of the database key file'
      );
    }

    // Saved callabcks
    let handleCompletionDefault;
    let handleCompletions = [];

    // connect to cloud and ensure is connected
    const app = initializeApp({
      credential: applicationDefault(),
      databaseURL,
    });
    const db = getFirestore(app);
    const submissions = db.collection(submissionsCollectionPath);

    // Update number of running executioners
    db.runTransaction(async (t) => {
      const ref = db.collection(infoPath).doc('info');
      const info = await t.get(ref);
      const count = info?.data()?.judgeCount ?? 0;
      if (info.data() === undefined) {
        t.create(ref, { judgeCount: 1 });
      } else {
        t.update(ref, { judgeCount: count + 1 });
      }
    });

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
    this.deactivate = async function () {
      // Update number of running executioners to one less
      await db.runTransaction(async (t) => {
        const ref = db.collection(infoPath).doc('info');
        const info = await t.get(ref);
        if (info.data() !== undefined) {
          const count = info.data()?.judgeCount;
          if (count !== undefined && count > 0) {
            t.update(ref, { judgeCount: count - 1 });
          }
        }
      });
    };
    this.onSubmission = function (handleSubmission) {
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

            // File names no longer stored, so cannot be read, so they must be
            // set later or removed from request in future
            const newRequest = new Request(id, problem, sourceCode, language);

            handleSubmission(newRequest);
          }
        });
      });
    };
    this.sendMessage = async (message) => {
      const result = await createFirestoreMessageHandler(
        async (id, data) => {
          // Special stuff with judging to avoid race conditions
          if (data.state === 'judging') {
            try {
              await db.runTransaction(async (t) => {
                const ref = submissions.doc(id);
                const submission = await t.get(ref);
                if (submission.data()?.state === 'queued') {
                  t.update(ref, data);
                } else {
                  throw 'Not queued anymore';
                }
              });
              return true;
            } catch (e) {
              if (e === 'Not queued anymore') {
                return false;
              } else {
                throw e;
              }
            }
          } else {
            submissions.doc(id).update(data);
            return true;
          }
        },
        async (id, data) => {
          await submissions
            .doc(id)
            .collection(submissionsJudgeResultPath)
            .add(data);
          return true;
        }
      )(message);
      // Last message is always a done unless error
      if (message.state === 'done') {
        // handle completion or don't, not required
        if (handleCompletions[message.id]) {
          handleCompletions[message.id]();
        } else if (handleCompletionDefault) {
          handleCompletionDefault();
        }
      }

      return result;
    };
    this.submissionComplete = function (id = null) {
      return new Promise((resolve) => {
        if (id === null) {
          handleCompletionDefault = resolve;
        } else {
          handleCompletions[id] = resolve;
        }
      });
    };
  } catch (e) {
    if (e.code === 'app/invalid-credential') {
      throw new Error(
        `The firestore credentials file ${process.env.GOOGLE_APPLICATION_CREDENTIALS} was not found`
      );
    } else {
      throw e;
    }
  }
}

// Test version of the firestore interface, mainly to test the message handling logic
export function TestFirestoreInterface({
  updateSubmissionField,
  addSubmissionResult,
}) {
  // Assertions
  if (!updateSubmissionField) {
    throw new Error(
      'updateSubmissionField callback not set in interface options'
    );
  }
  if (!addSubmissionResult) {
    throw new Error(
      'addSubmissionResult callback not set in interface options'
    );
  }

  let handleSubmission;
  let handleCompletionDefault;
  const handleCompletions = [];

  this.isActive = function () {
    return true;
  };
  this.onSubmission = function (callback) {
    handleSubmission = callback;
  };
  this.sendMessage = async function (message) {
    const result = await createFirestoreMessageHandler(
      updateSubmissionField,
      addSubmissionResult
    )(message);

    // Last message is always a done unless error
    if (message.state === 'done') {
      // handle completion or don't, not required
      if (handleCompletions[message.id]) {
        handleCompletions[message.id]();
      } else if (handleCompletionDefault) {
        handleCompletionDefault();
      }
    }

    // In case the function every does return something, return it
    return result;
  };
  this.pushSubmission = function (request) {
    if (typeof handleSubmission !== 'function') {
      throw new Error('onSubmission callback not set');
    }
    handleSubmission(request);
  };
  this.submissionComplete = function (id = null) {
    return new Promise((resolve) => {
      if (id === null) {
        handleCompletionDefault = resolve;
      } else {
        handleCompletions[id] = resolve;
      }
    });
  };
}

// Function to create function for how messages handled
// All the logic isolated in this funciton to be tested easily
function createFirestoreMessageHandler(
  updateSubmissionField,
  addSubmissionResult
) {
  return async function (message) {
    // Destructure message and add server time
    const { id, ...data } = message;

    const updateSubmissonState = (state) =>
      updateSubmissionField(id, { state });

    // If state is error then mark as error an do nothing else
    switch (data.state) {
      case state.executing:
        // Need to change this later to support multiple executioners and
        // prevent nasty race conditions
        return await updateSubmissonState('judging');
      case state.compiling:
        return await updateSubmissonState('compiling');
      case state.compiled:
        if (data.result === 'success') {
          return await updateSubmissonState('compiled');
        } else if (data.result === 'error') {
          // Compilation error is an endstate so 0 becomes score
          return await updateSubmissonState('compileError');
        } else {
          throw new Error(
            `Unexpected result: ${data.result} received from compiled message`
          );
        }
      case state.done:
        if (data.score !== undefined) {
          await updateSubmissionField(id, { score: data.score });
          data.failedSubtasks &&
            (await updateSubmissionField(id, {
              failedSubtasks: data.failedSubtasks,
            }));
          return await updateSubmissonState('judged');
        } else {
          // compilation error so no judged
          return await updateSubmissionField(id, { score: 0 });
        }
      case state.error:
        return await updateSubmissonState('error');
      case state.invalid:
        return await updateSubmissonState('invalidData');
    }
    // Otherwise add as judge result
    data.judgeTime = FieldValue.serverTimestamp();
    return await addSubmissionResult(id, data);
  };
}
