const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

/**
 * This gets the problem statement from the github repo.
 * @param {string} problem
 * @return {Promise<any>}
 */
function getProblemStatement(problem) { // eslint-disable-line no-unused-vars
  return fetch(
    `https://raw.githubusercontent.com/CP-STA/contest-problems/main/${problem}/statement.json`,
  )
    .then((res) => res.json());
}

/**
 * Gets the test case from the github repo.
 * @param {string} problem
 * @return {Promise<any>}
 */
function getTestCases(problem) { // eslint-disable-line no-unused-vars
  return fetch(
    `https://raw.githubusercontent.com/CP-STA/contest-problems/main/${problem}/test-cases.json`,
  )
    .then((res) => res.json());
}

exports.writeSubtasks = functions.firestore
  .document("/submissions/{submissionId}")
  .onCreate(async (snap, context) => {
    const problem = snap.data().problem;
    return getProblemStatement(problem)
      .then((json) => {
        let subtasks = {};
        subtasks = {};
        for (let i = 0; i < json.subtasks.length; i++) {
          subtasks[i + 1] = true;
        }
        return snap.ref.set({subtasks}, {merge: true});
      });
  });

exports.parseJudge = functions.firestore
  .document("/submissions/{submissionId}/judge-result/{judgeResultId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const submissionRef = db.collection("submissions").doc(context.params.submissionId);
    const submissionSnap = await submissionRef.get();
    const problem = submissionSnap.data().problem;
    const testCasesPromise = getTestCases(problem);
    const testCases = await testCasesPromise;
    if (snap.data().state == "tested" && snap.data().result != "accepted") {
      const currentTestCase = snap.data().testCase;
      const currentSubtask = testCases[currentTestCase-1];
      const key = `subtasks.${currentSubtask}`;
      const obj = {};
      obj[key] = false;
      return submissionRef.update(obj);
    } else {
      // TODO: handle normal submission
    }
  });
