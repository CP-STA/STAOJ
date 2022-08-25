import { readable } from 'svelte/store';
import { browser } from '$app/env';

let offset = 0;
let synced = false;

export const time = readable({ synced: false, date: new Date() }, function start(set) {
	if (browser) {
		(async () => {
			try {
				let response = await fetch('https://worldtimeapi.org/api/timezone/GMT');
				if (!response.ok) {
					throw Error('Response from the time url was not ok');
				}
				let data = await response.json();
				offset = data.unixtime - Math.floor(new Date().getTime() / 1000);
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
