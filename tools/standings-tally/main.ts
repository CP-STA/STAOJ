import * as dotenv from 'dotenv';
dotenv.config();

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';


async function getDocs(docs: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>): Promise<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]> {
  return await new Promise((resolve) => {
    let docsList: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = []
    docs.forEach((doc) => {
      docsList.push(doc);
      if (docsList.length == docs.size) {resolve(docsList)}
    })})
}

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
      displayName: string,
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
    const docsList = await getDocs(docs); 
    for (const doc of docsList){ try {
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
        let displayName: string = data.user;
        const a = db.collection("users").doc(data.user);
        const userInfo: {displayName: string} | null = await new Promise(
          (resolve) => {
            a.get().then((doc) => {if (doc.exists) {resolve(doc.data() as {displayName: string})} else {resolve(null)}}).catch((err) => {console.error(err); resolve(null)})
          });
        if (userInfo) {
          displayName = userInfo.displayName
        } else {
          try {
            const userRecord = await getAuth().getUser(data.user);
            if (userRecord.displayName) {displayName = userRecord.displayName}
          } catch (e) {
            console.error(e);
          }
        }
        people[data.user] = {
          displayName,
          scores,
          total: 0
        }
      }
      if (data.score > people[data.user as string].scores[data.problem]) {
        const oldScore = people[data.user as string].scores[data.problem];
        people[data.user].scores[data.problem as string] = data.score;
        people[data.user].total += (data.score - oldScore)
      }
    } catch (e) {console.error(e)} }
    if (!success) {
      console.log("Some submissions have not finished judging, retrying in 1 second");
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  await db.collection("standings").doc(contestName).set({
    name: contestDefinition.info.name,
    startTime: new Date(contestDefinition.info.startTime), 
    users: people
  });
  
  await db.collection("standings").doc("alpha-2").set({
    name: contestDefinition.info.name,
    startTime: new Date(contestDefinition.info.startTime), 
    users: people
  });
  console.log(people);
  process.exit(0);
}

main()