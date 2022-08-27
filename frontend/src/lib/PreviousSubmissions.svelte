<script>
	import { Query, onSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
	import { onMount } from 'svelte';
	import { onDestroy } from 'svelte';
	import { formatDate, formatFirebaseDate, getVerdict } from '$lib/utils';

	/** @type Query */
	export let q;
	/** @type QueryDocumentSnapshot[] */
	let submissions = [];

	/** @type boolean */
	export let isContest;

	let loading = true;

	/**
	 * @type {import("@firebase/firestore").Unsubscribe}
	 */
	let unsub;

	let startLoading = false;

	export function load() {
		if (!startLoading) {
			startLoading = true;
			unsub = onSnapshot(q, (querySnapshot) => {
				/** @type QueryDocumentSnapshot[] */
				let newSubmissions = [];
				querySnapshot.forEach((doc) => newSubmissions.push(doc));
				submissions = newSubmissions;
				loading = false;
			});
		}
	}

	onDestroy(() => {
		if (unsub) {
			unsub();
		}
	});
</script>

<table class="table">
	<tr>
		<th scope="col">ID</th>
		<th scope="col">Submission Time</th>
		<th scope="col">Verdict</th>
	</tr>
	{#if loading}
		<th scope="row">Loading...</th>
		<td />
		<td />
	{:else}
		{#each submissions as doc}
			<tr>
				<td
					><a class="p-0" href="/submissions/{doc.id}{isContest ? '?contest=true' : ''}">{doc.id}</a
					></td
				>
				<td>{formatFirebaseDate(doc.data().submissionTime)}</td>
				<td class="text-{getVerdict(doc.data()).verdictColor}">{getVerdict(doc.data()).verdict}</td>
			</tr>
		{/each}
	{/if}
</table>
