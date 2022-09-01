import type { Timestamp } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

export function formatDate(date: Date): String {
	return Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

export function formatFirebaseDate(date: Timestamp | null): String {
	if (date) {
		return formatDate(date.toDate());
	} else {
		return 'Loading...';
	}
}

export function formatFirebaseDateFromDoc(doc: DocumentData | null | undefined): String {
	if (doc) {
		return formatFirebaseDate(doc.submissionTime);
	} else {
		return 'Loading...';
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
			queued: {
				verdict: 'Queued',
				verdictColor: 'dark'
			},
			compiling: {
				verdict: 'Compiling...',
				verdictColor: 'dark'
			},
			compiled: {
				verdict: 'Compiled',
				verdictColor: 'dark'
			},
			compileError: {
				verdict: 'Compilation Error',
				verdictColor: 'danger'
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
		} else if (submissionDoc.state in verdictMap) {
			// @ts-ignore
			({ verdict, verdictColor } = verdictMap[submissionDoc.state]);
		} else {
			verdict = 'Error (E3)';
			verdictColor = 'danger';
		}
	} else {
		verdict = 'Error (E2)';
		verdictColor = 'danger';
	}
	return { verdict, verdictColor };
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatTitle(s: string) {
	return `${s} | STAOJ Testing`;
}
