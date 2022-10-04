import * as dotenv from "dotenv";
dotenv.config();

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";

async function getDocs(
  docs: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
): Promise<
  FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[]
> {
  return await new Promise((resolve) => {
    let docsList: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] =
      [];
    docs.forEach((doc) => {
      docsList.push(doc);
      if (docsList.length == docs.size) {
        resolve(docsList);
      }
    });
  });
}

function difficulty(problem: { slug: string; name: string, difficulty: string }): number {
  const count = (problem.difficulty.match(/☆/g) || []).length;
  return count;
}

async function main() {
  const app = initializeApp();
  const db = getFirestore(app);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const contestName: string = await new Promise((resolve) =>
    rl.question("Contest name: ", (answer) => {
      resolve(answer);
    })
  );

  const contestDefinitionPath = `../../problems-private/contests/${contestName}.json`;
  const contestDefinition: {
    info: any;
    problems: { slug: string; name: string, difficulty: string }[];
  } = require(contestDefinitionPath);
  const submissionCollection = db.collection("submissions");
  interface UserStanding {
    [uid: string]: {
      displayName: string;
      problems: {
        [problem: string]: {
          score: number;
          scaledScore: number;
          difficulty: number;
        };
      };
      total: number;
      scaledTotal: number;
    };
  }

  interface SubmissionDocument {state: "judged" | "compileError", user: string, score: number, problem: string} 

  let people: UserStanding = {};
  let success = false;
  let problems = contestDefinition.problems.map((x: any) => {
    return x.slug;
  });

  let problemsOrder: string[] = [];
  let problemsNames: { [problem: string]: string } = {};
  for (const problem of contestDefinition.problems) {
    problemsOrder.push(problem.slug);
    problemsNames[problem.slug] = problem.name;
  }

  while (!success) {
    const docs = await submissionCollection
      .where("submissionTime", ">=", new Date(contestDefinition.info.startTime))
      .where("submissionTime", "<=", new Date(contestDefinition.info.endTime))
      .get();
    people = {};
    success = true;
    const docsList= await getDocs(docs);
    for (const doc of docsList) {
      const data: SubmissionDocument = doc.data() as SubmissionDocument;
      if (data.state != "judged" && data.state != "compileError") {
        success = false;
        console.log(
          "Some submissions have not finished judging, retrying in 1 second"
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      if (!(data.user in people)) {
        let problems: { [problem: string]: { score: number, scaledScore: number, difficulty:number } } = {};
        for (const problem of contestDefinition.problems) {
          problems[problem.slug] = {
            score: 0,
            scaledScore: 0,
            difficulty: difficulty(problem),
          };
        }
        let displayName: string = data.user;
        const a = db.collection("users").doc(data.user);
        const userInfo: { displayName: string } | null = await new Promise(
          (resolve) => {
            a.get()
              .then((doc) => {
                if (doc.exists) {
                  resolve(doc.data() as { displayName: string });
                } else {
                  resolve(null);
                }
              })
              .catch((err) => {
                console.error(err);
                resolve(null);
              });
          }
        );
        if (userInfo) {
          displayName = userInfo.displayName;
        } else {
          try {
            const userRecord = await getAuth().getUser(data.user);
            if (userRecord.displayName) {
              displayName = userRecord.displayName;
            }
          } catch (e) {
            console.error(e);
          }
        }
        people[data.user] = {
          displayName,
          problems,
          total: 0,
          scaledTotal: 0
        };
      }
      if (
        data.problem in people[data.user as string].problems &&
        data.score >
          people[data.user as string].problems[data.problem as string].score
      ) {
        const oldScore =
          people[data.user as string].problems[data.problem as string].score;
        const oldScaledScore = 
          people[data.user as string].problems[data.problem as string].scaledScore;
        const scaledScore = data.score * people[data.user].problems[data.problem as string].difficulty
        people[data.user].problems[data.problem as string].score = data.score;
        people[data.user].problems[data.problem as string].scaledScore = scaledScore;
        people[data.user].scaledTotal += scaledScore - oldScaledScore;
        people[data.user].total += data.score - oldScore;
      }
    }
    console.log(people);
  }

  let usersOrder: { uid: string; data: { total: number } }[] = [];
  for (const [uid, data] of Object.entries(people)) {
    usersOrder.push({ uid, data });
  }

  usersOrder.sort((first, second) => {
    return -first.data.total + second.data.total;
  });

  await db
    .collection("standings")
    .doc(contestName)
    .set({
      name: contestDefinition.info.name,
      startTime: new Date(contestDefinition.info.startTime),
      users: people,
      usersOrder: usersOrder.map((x) => x.uid),
      problemsOrder,
      problemsNames,
    });

  console.log(people);
  process.exit(0);
}

main();
