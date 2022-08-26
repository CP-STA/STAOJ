<script>
	// @ts-nocheck
	// TS is so fucking annoying. After adding so much type annotation to make TS happy I still get erorr like Property does not exists on type 'never'.

	import { onMount } from 'svelte';
	import { user } from '$lib/User.svelte';
	import { app as firebaseApp, db } from '$lib/firebase';
	import {
		collection,
		doc,
		setDoc,
		addDoc,
		serverTimestamp,
		onSnapshot,
		DocumentReference,
		query,
		where,
		orderBy,
		QuerySnapshot,
		Query,
		limit,
		QueryDocumentSnapshot
	} from 'firebase/firestore';
	import MonacoBlock from '$lib/MonacoBlock.svelte';
	import { formatDate, formatFirebaseDate } from '$lib/utils';
	import PreviousSubmissions from '$lib/PreviousSubmissions.svelte';
	import Header from './Header.svelte';
	import { getVerdict } from '$lib/utils';

	/** @type any */
	export let languages;

	/** @type String */
	export let problem;

	/** @type String */
	export let problemName;

	/** @type boolean */
	export let isConest;

	/** @type subtasksCount */
	export let subtasksCount;

	/** @type MonacoBlock */
	let monacoBlock;

	/** @type String */
	let selectedLanguage = '';
	/** @type HTMLDivElement */
	let editorBlock;

	/** @type import('monaco-editor')*/
	let monaco;

	/** @type PreviousSubmissions */
	let previousSubmissions;

	/** @type String */
	let monacoLangauge;
	$: if (selectedLanguage) {
		monacoLangauge = languages[selectedLanguage].monaco;
	}

	let submitted = false;
	async function getMonaco() {
		if (monaco) {
			return monaco;
		} else {
			monaco = await import('monaco-editor');
			return monaco;
		}
	}

	function newSubmission() {
		recentSubmissionData = null;
		submitted = false;
	}

	/** @type QueryDocumentSnapshot */
	let recentSubmissionDoc;

	/** @type {() => void} | null */
	let recentSubmissionRefUnsub;

	/**
	 * @type {import("@firebase/firestore").DocumentData | null}
	 */
	let recentSubmissionData = null;

	async function submitCode() {
		if (!recentSubmissionRefUnsub) {
			/** @type Query */
			const q = query(
				collection(db, 'submissions'),
				where('user', '==', $user.user.uid),
				where('problem', '==', problem),
				orderBy('submissionTime', 'desc'),
				limit(1)
			);
			recentSubmissionRefUnsub = onSnapshot(q, (querySnapshot) => {
				querySnapshot.forEach((doc) => {
					recentSubmissionDoc = doc;
				});
			});
		}
		const p = addDoc(collection(db, 'submissions'), {
			// @ts-ignore
			user: $user.user.uid,
			problem: problem,
			problemName: problemName,
			sourceCode: monacoBlock.getCode(),
			language: selectedLanguage,
			submissionTime: serverTimestamp(),
			subtasksCount: subtasksCount,
			judged: false,
			error: false
		});
		submitted = true;
		await p;
	}

	let loadPreviousSubmissions = false;

	onMount(() => {
		return () => {
			if (recentSubmissionRefUnsub) {
				console.log('unsub');
				recentSubmissionRefUnsub();
			}
		};
	});
</script>

<div class="accordion my-3">
	<div class="accordion-item">
		<h2 class="accordion-header" id="headingOne">
			<button
				class="accordion-button collapsed"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#collapseOne"
				aria-expanded="false"
				aria-controls="collapseOne"
			>
				Submit Code
			</button>
		</h2>
		<div id="collapseOne" class="accordion-collapse collapse" aria-labelledby="headingOne">
			<div class="">
				<div class="accordion-body">
					{#if !$user.loaded}
						Loading account information...
					{:else if !$user.user}
						Please log in to submit code.
					{:else if !submitted}
						<form on:submit|preventDefault={submitCode}>
							<label for="langauge" class="form-lable">Language</label>
							<select bind:value={selectedLanguage} class="form-select mb-3" required>
								{#each Object.entries(languages) as [key, value]}
									<option value={key}>
										{value.name}
									</option>
								{/each}
							</select>

							<MonacoBlock language={monacoLangauge} bind:this={monacoBlock} />
							<button type="submit" class="btn btn-primary mt-3">Submit</button>
						</form>
					{:else if submitted}
						{#if recentSubmissionDoc}
							<table class="table">
								<tr>
									<th scope="col">ID</th>
									<th scope="col">Submission Time</th>
									<th scope="col">Verdict</th>
								</tr>
								<tr>
									<td
										><a
											class="p-0"
											href="/submissions/{recentSubmissionDoc.id}{isConest ? '?contest=true' : ''}"
										>
											{recentSubmissionDoc.id}
										</a></td
									>
									<td>{formatFirebaseDate(recentSubmissionDoc.data().submissionTime)}</td>
									<td class="text-{getVerdict(recentSubmissionDoc.data()).verdictColor}"
										>{getVerdict(recentSubmissionDoc.data()).verdict}</td
									>
								</tr>
							</table>
						{:else}
							<p>Loading...</p>
						{/if}
						<button class="btn btn-primary" on:click={newSubmission}>Submit Again</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<div class="accordion-item">
		<h2 class="accordion-header" id="headingTwo">
			<button
				on:click={previousSubmissions.load}
				class="accordion-button collapsed"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#collapseTwo"
				aria-expanded="false"
				aria-controls="collapseTwo"
			>
				Previous Submissions
			</button>
		</h2>
		<div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo">
			<div class="accordion-body">
				{#if !$user.loaded}
					Loading account information...
				{:else if !$user.user}
					Please log in.
				{:else}
					<PreviousSubmissions
						bind:this={previousSubmissions}
						q={query(
							collection(db, 'submissions'),
							where('user', '==', $user.user.uid),
							where('problem', '==', problem),
							orderBy('submissionTime', 'desc')
						)}
						{isConest}
					/>
				{/if}
			</div>
		</div>
	</div>
</div>
