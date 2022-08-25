/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const url = `https://raw.githubusercontent.com/CP-STA/contest-problems/main/past-problems.json`;
	const response = await fetch(url);

	return await response.json();
}
