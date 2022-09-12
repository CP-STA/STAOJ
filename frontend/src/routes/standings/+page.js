import { db } from '$lib/firebase';
import { doc, collection, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, url }) {
  console.log("hello");
	const docs = await getDocs(query(collection(db, 'standings'), orderBy('startTime', 'desc')));

	let standingsData = await new Promise((resolve) => {
		/** @type {any[]} */
		let newStandingsData = [];
    if (docs.size == 0) {
      resolve(newStandingsData);
    }
		docs.forEach((doc) => {
			newStandingsData.push(doc.data());
			if (newStandingsData.length == docs.size) {
				resolve(newStandingsData);
			}
		});
	});
	return { standingsData };
}
