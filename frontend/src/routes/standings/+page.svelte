<script>
	import {
		onSnapshot,
		collection,
		doc,
		query,
		orderBy,
		Timestamp,
		limit,
		where
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { onDestroy } from 'svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {any[]} */

	let standingsData = data.standingsData;

	const unsub = onSnapshot(
		query(collection(db, 'standings'), orderBy('startTime', 'desc')),
		(docs) => {
			/** @type {any[]} */
			let newStandingsData = [];
			docs.forEach((doc) => {
				newStandingsData.push(doc.data());
			});
			standingsData = newStandingsData;
		}
	);

	onDestroy(() => {
		unsub();
	});
</script>

<h1>Standings</h1>

{#each standingsData as data}
	<h2>{data.name}</h2>
	<table class="table">
		<thead>
			<tr>
				<th scope="col">#</th>
				<th scope="col">Name</th>
				{#each data.problemsOrder as problemSlug}
					<th scope="col">{data.problemsNames[problemSlug]}</th>
				{/each}
				<th>Total</th>
			</tr>
		</thead>
		<tbody>
			{#each data.usersOrder as uid, i}
				<tr>
					<th scope="row">{data.usersRanking[i] + 1}</th>
					<td>{data.users[uid].displayName}</td>
					{#each data.problemsOrder as problemSlug}
						<td>{data.users[uid].problems[problemSlug].scaledScore}</td>
					{/each}
					<td>{data.users[uid].scaledTotal}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<hr />
{/each}
