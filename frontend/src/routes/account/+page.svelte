<script>
	// @ts-nocheck

	import { app as firebaseApp, db } from '$lib/firebase';
	import { getAuth, signOut, signInWithPopup, GithubAuthProvider } from 'firebase/auth';
	import { user } from '$lib/User.svelte';
	import { formatTitle } from '$lib/utils';
	import { onSnapshot, doc, setDoc } from 'firebase/firestore';
	import { onDestroy } from 'svelte'; 



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

	let displayName = "Loading..."; 
	let isNameLoaded = false;

	let unsub;

	onDestroy(() => {
		if (unsub) {unsub()}
	})

	$: if (!isNameLoaded && $user.loaded && $user.user) {
		if (unsub) {unsub()}
		unsub = onSnapshot(doc(db, "users", $user.user.uid), (doc) => {
			if (doc.data()) {
				displayName = doc.data().displayName;
			} else {
				displayName = $user.user.displayName;
			}
			isNameLoaded = true;
		})
	}

	let nothingState = Symbol();
	let errorState = Symbol();
	let waitingState = Symbol();
	let successState = Symbol();

	let updateState = nothingState;
	

	async function updateInfo() {
		if ($user.loaded && $user.user) {
			updateState = waitingState
			try {
			await setDoc(doc(db, "users", $user.user.uid), {
				displayName
			})
		} catch (e) {
			updateState = errorState
			throw e;
		}
		updateState = successState
		}
	}

</script>

<svelte:head>
	<title>{formatTitle('Account')}</title>
</svelte:head>

<h1>
	Account {#if $user.user}<button type="button" class="btn btn-warning" on:click={signOutHandler}
			>Sign Out</button
		>{/if}
</h1>

{#if !$user.loaded}
	<p>Loading...</p>
{:else if $user.user}
	<form on:submit|preventDefault={updateInfo}>
		<div class="form-group">
			<label for="displayName">Name</label>
			<input bind:value={displayName} type="text" class="form-control" id="DisplayName">
			{#if updateState == successState}
			<div class="alert alert-success mt-3" role="alert">
				Update Successful
			</div>
			{:else if updateState == errorState}
			<div class="alert alert-danger mt-3" role="alert">
				Update Unsuccessful
			</div>	
			{:else if updateState == waitingState}
			<div class="alert alert-warning mt-3" role="alert">
				Updating
			</div>	
			{/if}
			<button type="submit" class="btn btn-primary" class:mt-3={updateState == nothingState}>Update</button>
		</div>
	</form>

{:else}
	<button type="button" class="w-100 btn btn-lg btn-primary mb-3" on:click={signInWithGithub}
		><i class="bi bi-github" /> Sign in with Github</button
	>
{/if}
