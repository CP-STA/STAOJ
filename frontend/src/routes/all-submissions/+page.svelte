<script>
	import PreviousSubmissions from '$lib/PreviousSubmissions.svelte';
	import User from '$lib/User.svelte';
	import { db } from '$lib/firebase';
	import { query, collection, orderBy, limit, where } from 'firebase/firestore';
	const q = query(collection(db, 'submissions'), orderBy('submissionTime', 'desc'), limit(50));
	/**
	 * @type {PreviousSubmissions}
	 */
	let previousSubmissions;
	$: {
		if (previousSubmissions) {
			previousSubmissions.load();
		}
	}
</script>

<PreviousSubmissions {q} isContest={false} bind:this={previousSubmissions} showUser={true} />
