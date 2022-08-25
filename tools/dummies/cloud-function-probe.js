// ======= Functions and headers copied from cloud functions ========== 

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


// ======= end of functions and headers copied from cloud functions ========== 

// ======== database and document setup =======

require('dotenv').config()
const db = admin.firestore()

// ========= end of database and document setup =========

// ======== begin probe area ===========

const ref = db.collection("submissions").doc("8yKUKPbvdmYvYJQ0JgFb")

let a = async (snap, context) => {
  const problem = snap.data().problem;
  const problemStatement = await getProblemStatement(problem);
  snap.ref.update({subtasksCount: problemStatement.subtasks.length})
}

// ======== end probe area ============

(async () => a(await ref.get(), {}))()