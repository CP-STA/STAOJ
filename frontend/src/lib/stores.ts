import { readable } from 'svelte/store';
import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

let offset = 0;
let synced = false;

export const time = readable({ synced: false, date: new Date() }, function start(set) {
	if (browser) {
		(async () => {
			try {
				let response = await fetch('https://time.deyaochen.com');
				if (!response.ok) {
					throw Error('Response from the time url was not ok');
				}
				let serverDate = new Date(await response.text());
				offset = Math.floor(serverDate.getTime() / 1000 - new Date().getTime() / 1000);
				synced = true;
				let date = new Date((offset + Math.floor(new Date().getTime() / 1000)) * 1000);
				set({ synced, date });
			} catch (error) {
				console.error(error);
			}
		})();
	}
	const interval = setInterval(() => {
		let date = new Date((offset + Math.floor(new Date().getTime() / 1000)) * 1000);
		set({ synced, date });
	}, 1000);

	return function stop() {
		clearInterval(interval);
	};
});

export const judgeCount = readable(1, function start(set) {
	const infoDoc = doc(db, 'info', 'info');
	onSnapshot(infoDoc, (snapshot) => {
		const documentData = snapshot.data();
		if (documentData && 'judgeCount' in documentData) {
			set(documentData.judgeCount);
		}
	});
});
