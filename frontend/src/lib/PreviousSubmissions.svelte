<script>
	import { Query, onSnapshot, QueryDocumentSnapshot, doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { onMount } from 'svelte';
	import { onDestroy } from 'svelte';
	import { formatDate, formatFirebaseDate, getVerdict } from '$lib/utils';

	/** @type Query */
	export let q;
	/** @type QueryDocumentSnapshot[] */
	let submissions = [];

	/** @type boolean */
	export let isContest;

	/** @type boolean */
	export let showUser;

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
	/** @type {Record<string, string>} */
	const displayNameMemo = {};
	/**
	 * @param {string} uid
	 * @returns {Promise<string>}
	 */
	async function getDisplayname(uid) {
		if (displayNameMemo[uid]) {
			return displayNameMemo[uid];
		}
		const docRef = doc(db, 'users', uid);
		const docSnap = await getDoc(docRef);
		console.log(docSnap);
		const data = docSnap.data();
		if (data) {
			displayNameMemo[uid] = data.displayName;
			return data.displayName;
		}
		return uid;
	}
</script>

<table class="table">
	<tr>
		<th scope="col">ID</th>
		{#if showUser}
			<th scope="col">UID</th>
		{/if}
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
				{#if showUser}
					{#await getDisplayname(doc.data().user)}
						<td>Loading...</td>
					{:then displayName}
						<td>{displayName}</td>
					{:catch error}
						<td>{doc.data().user}</td>
					{/await}
				{/if}
				<td>{formatFirebaseDate(doc.data().submissionTime)}</td>
				<td class="text-{getVerdict(doc.data()).verdictColor}">{getVerdict(doc.data()).verdict}</td>
			</tr>
		{/each}
	{/if}
</table>
