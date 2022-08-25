<script context="module">
	import { readable } from 'svelte/store';

	import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
	import { app } from '$lib/firebase';

	const auth = getAuth(app);
	export const user = readable(
		{ loaded: false, user: null },
		function start(set) {
			onAuthStateChanged(auth, async (user) => {
				if (user) {
					// @ts-ignore
					set({ loaded: true, user });
				} else {
					// @ts-ignore
					set({ loaded: true, user: null });
				}
			});
		}
		// TODO: Free the resource after use
	);
</script>
