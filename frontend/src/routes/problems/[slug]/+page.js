import { db } from '$lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, url }) {
	const isContest = url.searchParams.get('contest') == 'true';
	let problem;
	if (isContest) {
		const docRef = doc(db, 'problems', params.slug);
		const docSnap = await getDoc(docRef);
		problem = docSnap.data();
	} else {
		const problemUrl = `https://raw.githubusercontent.com/CP-STA/contest-problems/main/${params.slug}/statement.json`;
		const problemResponse = await fetch(problemUrl);
		problem = await problemResponse.json();
	}

	const languageUrl = `https://raw.githubusercontent.com/CP-STA/contest-problems/main/supported-languages.json`;
	const languageResponse = await fetch(languageUrl);
	return { problem, languages: await languageResponse.json() };
}
