import type { Timestamp } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

export function formatDate(date: Date): String {
	return Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

export function formateFirebaseDate(date: Timestamp | null): String {
	if (date) {
		return formatDate(date.toDate());
	} else {
		return 'Waiting for Server';
	}
}
export async function getProblem(problem: string, isContest: boolean) {
	if (isContest) {
		return (await getDoc(doc(db, 'problems', problem))).data();
	} else {
		const problemUrl = `https://raw.githubusercontent.com/CP-STA/contest-problems/main/${problem}/statement.json`;
		const problemResponse = await fetch(problemUrl);
		problem = await problemResponse.json();
	}
}

export function getVerdict(submissionDoc: DocumentData | null | undefined) {
	let verdict: string = 'Loading...';
	let verdictColor: string = 'dark';
	if (!submissionDoc) {
	} else if (submissionDoc.state) {
		const verdictMap = {
			compiling: {
				verdict: 'Compiling...',
				verdictColor: 'dark'
			},
			compiled: {
				verdict: 'Compiled',
				verdictColor: 'dark'
			},
			judging: {
				verdict: 'Running tests...',
				verdictColor: 'dark'
			},
			error: {
				verdict: 'Unknown error',
				verdictColor: 'danger'
			}
		};
		if (submissionDoc.state == 'judged') {
			if (submissionDoc.score == 1) {
				verdict = 'Accepted';
				verdictColor = 'success';
			} else if (submissionDoc.score != 1 && submissionDoc.score != 0) {
				verdict = `Partial Score ${submissionDoc.score * 100}%`;
				verdictColor = 'warning';
			} else if (submissionDoc.score == 0) {
				verdict = `No Score`;
				verdictColor = 'danger';
			}
		} else {
			// @ts-ignore
			({ verdict, verdictColor } = verdictMap[submissionDoc.state]);
		}
	} else if (submissionDoc.compiling) {
		verdict = 'Compiling...';
		verdictColor = 'dark';
	} else if (submissionDoc.compiled) {
		verdict = 'Compiled';
		verdictColor = 'dark';
	} else if (submissionDoc.judging) {
		verdict = 'Running tests...';
		verdictColor = 'dark';
	} else if (submissionDoc.judged && submissionDoc.score == 1) {
		verdict = 'Accepted';
		verdictColor = 'success';
	} else if (submissionDoc.judged && submissionDoc.score != 1 && submissionDoc.score != 0) {
		verdict = `Partial Score ${submissionDoc.score * 100}%`;
		verdictColor = 'warning';
	} else if (submissionDoc.judged && submissionDoc.score == 0) {
		verdict = `No Score`;
		verdictColor = 'danger';
	} else if (submissionDoc.error) {
		// Being verbose here in case for sign posting so we don't forget about it in case we want slightly different behaviour in the future/
		verdict = 'Unknown Error';
		verdictColor = 'danger';
	} else {
		verdict = 'Queued';
		verdictColor = 'dark';
	}
	return { verdict, verdictColor };
}
