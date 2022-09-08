import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getDocs, query, where, collection } from 'firebase/firestore';
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

async function main() {
  const app = initializeApp();
  const db = getFirestore(app);
  
  const rl = readline.createInterface({input: stdin, output: stdout});
  const contestName: string = await new Promise(resolve => rl.question("Contest name: ", (answer) => {resolve(answer)}));
  
  const contestDefinitionPath = `../../problems-private/contests/${contestName}.json`;
  const contestDefinition = require(contestDefinitionPath);
  const submissionCollection = db.collection('submissions'); 
  interface UserStanding {
    [uid: string]: {
      scores: {[problem: string]: number},
      total: number
    };
  }
  
  
  let people: UserStanding = {};
  let success = false;
  let problems = contestDefinition.problems.map((x: any) => {
    return x.slug
  });
  while (!success) {
    const docs = await submissionCollection.where('submissionTime', '>=', new Date(contestDefinition.info.startTime)).where('submissionTime', '<=', new Date(contestDefinition.info.endTime)).get();
    people = {};
    success = true; 
    docs.forEach((doc) => {
      if (!success) {return};
      const data = doc.data();
      if (data.state != "judged") {
        success = false;
        return
      } 
      if (!(data.user in people)) {
        let scores: {[problem: string]: number} = {};
        for (const problem of contestDefinition.problems) {
          scores[problem.slug] = 0; 
        }
        people[data.user] = {
          scores,
          total: 0
        }
      }
      console.log(data.score, people[data.user as string].scores[data.problem])
      if (data.score > people[data.user as string].scores[data.problem]) {
        const oldScore = people[data.user as string].scores[data.problem];
        people[data.user].scores[data.problem as string] = data.score;
        people[data.user].total += (data.score - oldScore)
      }
    })
    if (!success) {
      console.log("Some submissions have not finished judging, retrying in 1 second");
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  await db.collection("standings").doc(contestName).set(people);
  console.log(people);


  process.exit(0);
}

main()