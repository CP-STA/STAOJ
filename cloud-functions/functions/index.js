const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.writeSubtasks = functions.firestore
  .document("/submissions/{submissionId}")
  .onCreate((snap, context) => {
    const problem = snap.data().problem;
    return fetch(
      `https://raw.githubusercontent.com/CP-STA/contest-problems/main/${problem}/statement.json`
    )
      .then((res) => res.json())
      .then((json) => {
        let subtasks = {};
        subtasks = {};
        for (let i = 0; i < json.subtasks.length; i++) {
          subtasks[i + 1] = true;
        }
        return snap.ref.set({subtasks}, {merge: true});
      });
  });
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
