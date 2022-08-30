/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, url }) {
	const languageUrl = `https://raw.githubusercontent.com/CP-STA/contest-problems/main/supported-languages.json`;
	const languageResponse = await fetch(languageUrl);
	return { languages: await languageResponse.json() };
}
