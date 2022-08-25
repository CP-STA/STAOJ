<script>
	// @ts-nocheck

	import { app as firebaseApp } from '$lib/firebase';
	import { getAuth, signOut, signInWithPopup, GithubAuthProvider } from 'firebase/auth';
	import { user } from '$lib/User.svelte';

	const provider = new GithubAuthProvider();
	const auth = getAuth(firebaseApp);
	function signInWithGithub() {
		signInWithPopup(auth, provider).catch((error) => {
			console.error(error);
		});
	}

	function signOutHandler() {
		signOut(auth).catch((error) => {
			console.error(error);
		});
	}
</script>

<h1>
	Account {#if $user.user}<button type="button" class="btn btn-warning" on:click={signOutHandler}
			>Sign Out</button
		>{/if}
</h1>

{#if !$user.loaded}
	<p>Loading...</p>
{:else if $user.user}
	<p>Hello {$user.user.displayName}.</p>
{:else}
	<button type="button" class="w-100 btn btn-lg btn-primary mb-3" on:click={signInWithGithub}
		><i class="bi bi-github" /> Sign in with Github</button
	>
{/if}
