import * as dotenv from "dotenv";
dotenv.config();

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDocs, query, where, collection } from "firebase/firestore";
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

async function main() {
  const app = initializeApp();
  const db = getFirestore(app);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const contestName = await new Promise((resolve) =>
    rl.question("Contest name: ", (answer) => {
      resolve(answer);
    })
  );

  let waitFor: Promise<any>[] = [];

  const contestDefinitionPath = `../../problems-private/contests/${contestName}.json`;
  const contestDefinition = require(contestDefinitionPath);
  const submissionCollection = db.collection("submissions");
  waitFor.push(
    submissionCollection.add({
      problem: contestDefinition.problems[0].slug,
      state: "judged",
      score: 0.4,
      user: "abc",
      submissionTime: new Date(contestDefinition.info.startTime),
    })
  );
  waitFor.push(
    submissionCollection.add({
      problem: contestDefinition.problems[0].slug,
      state: "judged",
      score: 0.6,
      user: "abc",
      submissionTime: new Date(contestDefinition.info.startTime),
    })
  );
  waitFor.push(
    submissionCollection.add({
      problem: contestDefinition.problems[0].slug,
      state: "judged",
      score: 0.3,
      user: "ddd",
      submissionTime: new Date(contestDefinition.info.startTime),
    })
  );
  waitFor.push(
    submissionCollection.add({
      problem: contestDefinition.problems[1].slug,
      state: "judged",
      score: 0,
      user: "abc",
      submissionTime: new Date(contestDefinition.info.startTime),
    })
  );
  waitFor.push(
    submissionCollection.add({
      problem: contestDefinition.problems[2].slug,
      state: "judged",
      score: 0.2,
      user: "ddd",
      submissionTime: new Date(contestDefinition.info.startTime),
    })
  );
  waitFor.push(
    submissionCollection.add({
      problem: "other-problem",
      state: "judged",
      score: 0.2,
      user: "ddd",
      submissionTime: new Date(contestDefinition.info.startTime),
    })
  );

  await Promise.all(waitFor);
  process.exit(0);
}

main();
