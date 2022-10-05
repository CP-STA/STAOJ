<script>
	import { page } from '$app/stores';
	import { db } from '$lib/firebase';
	import {
		query,
		onSnapshot,
		orderBy,
		collection,
		doc,
		limit,
		documentId,
		where
	} from 'firebase/firestore';
	import { browser } from '$app/env';
	import { getVerdict, formatFirebaseDate, formatFirebaseDateFromDoc, sleep } from '$lib/utils';
	import { onDestroy, onMount } from 'svelte';
	import { formatTitle } from '$lib/utils';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @type string */
	const id = $page.params.id;
	const q = query(collection(db, 'submissions', id, 'judge-results'), orderBy('judgeTime', 'asc'));
	const isContest = $page.url.searchParams.get('contest') == 'true';
	/** @type any[] */
	let judgeResults = [];
	/** @type {{ [x: number]: { verdict: string; subtask: number; memory: number; time: number, color: string}; }} */
	let testCasesResults = {};
	let resultMap = {
		accepted: 'Accepted',
		TLE: 'Time Limit Exceeded',
		MLE: 'Memory Limit Exceeded',
		error: 'Runtime Error',
		wrong: 'Wrong Answer'
	};

	let resultColorMap = {
		accepted: 'success',
		TLE: 'danger',
		MLE: 'danger',
		error: 'danger',
		wrong: 'danger'
	};

	/** @type {import("@firebase/firestore").DocumentData | undefined} */
	let submissionDoc;
	let verdict = 'Loading...';
	let verdictColor = 'dark';
	/** @type {import("@firebase/firestore").DocumentData} */
	$: {
		({ verdict, verdictColor } = getVerdict(submissionDoc));
	}

	/** @type {import("@firebase/firestore").Unsubscribe | undefined} */
	let submissionDocUnsub;

	/** @param {number} retries the number of retries remaining */
	function retrySubmissionDoc(retries) {
		if (retries > 0) {
			submissionDocUnsub = onSnapshot(
				doc(db, 'submissions', id),
				(doc) => {
					submissionDoc = doc.data();
				},
				async (error) => {
					console.error(error);
					console.log('Retrying getting sumission document after .5 second');
					await sleep(500);
					console.log(`Retrying... remaning retries ${retries - 1}`);
					retrySubmissionDoc(retries - 1);
				}
			);
		}
	}
	/** @type {import("@firebase/firestore").Unsubscribe | undefined} */
	let testResultsUnsub;
	/** @param {number} retries the number of retries remaining */
	function retryTestResults(retries) {
		if (retries > 0) {
			testResultsUnsub = onSnapshot(
				q,
				(snapshot) => {
					/** @type any[] */
					let newJudgeResults = [];
					snapshot.forEach((document) => {
						newJudgeResults.push(document.data());
						if (document.data().state == 'testing' && !testCasesResults[document.data().testCase]) {
							// @ts-ignore
							testCasesResults[document.data().testCase] = {
								verdict: 'Testing',
								memory: 0,
								time: 0,
								subtask: document.data().subtask,
								color: 'dark'
							};
						} else if (document.data().state == 'tested') {
							testCasesResults[document.data().testCase] = {
								// @ts-ignore
								verdict: resultMap[document.data().result],
								memory: document.data().memory,
								time: document.data().time,
								subtask: document.data().subtask,
								// @ts-ignore
								color: resultColorMap[document.data().result]
							};
						}
					});
					judgeResults = newJudgeResults;
				},
				async (error) => {
					console.error(error);
					console.log('Retrying getting results document after .5 second');
					await sleep(500);
					console.log(`Retrying... remaning retries ${retries - 1}`);
					retryTestResults(retries - 1);
				}
			);
		}
	}

	if (browser && true) {
		retryTestResults(16);
		retrySubmissionDoc(16);
	}

	/** @type {HTMLPreElement} */
	let codeBlock;

	/** @param {string} s
	 * @param {string} language */
	async function colorize(s, language) {
		const monaco = await import('monaco-editor');
		return await monaco.editor.colorize(s, language, {});
	}
	onDestroy(() => {
		if (testResultsUnsub) {
			testResultsUnsub();
		}
		if (submissionDocUnsub) {
			submissionDocUnsub();
		}
	});
</script>

<svelte:head>
	<title>{formatTitle('Submission Result')}</title>
</svelte:head>

<h1>Submission Result</h1>
<p>
	Problem: {#if submissionDoc}<a
			href="/problems/{submissionDoc.problem}{isContest ? '?contest=true' : ''}"
			>{submissionDoc.problemName}</a
		>{:else}Loading...{/if}
	<br />
	Submission: {id}
	<br />
	Submission Time: {formatFirebaseDateFromDoc(submissionDoc)}
</p>

<h2>Verdict: <span class="text-{verdictColor}"> {verdict} </span></h2>

<table class="table">
	<tr>
		<th scope="col"># Test Case</th>
		{#if submissionDoc && submissionDoc.subtasksCount && submissionDoc.subtasksCount != 0}<th
				scope="col"># Subtask</th
			>{/if}
		<th scope="col" class="text-end">Time(ms)</th>
		<th scope="col" class="text-end">Memory(kb)</th>
		<th scope="col" class="text-center">Verdict</th>
	</tr>
	{#if testCasesResults}
		{#each Object.entries(testCasesResults) as [i, testCaseResult]}
			<tr>
				<th scope="row">{i}</th>
				{#if submissionDoc && submissionDoc.subtasksCount && submissionDoc.subtasksCount != 0}<td
						>{testCaseResult.subtask}</td
					>{/if}
				<td class="text-end">{testCaseResult.time ? testCaseResult.time : ''}</td>
				<td class="text-end">{testCaseResult.memory ? testCaseResult.memory : ''}</td>
				<td class="text-center text-{testCaseResult.color}">{testCaseResult.verdict}</td>
			</tr>
		{/each}
	{/if}
</table>

<h2>Source Code</h2>
<div class="card">
	<div class="card-body">
		{#if submissionDoc}
			<!-- tell prettier to ignore the next line because in pre block, whitespace matters -->
			<!-- prettier-ignore -->
			<pre class="m-0"><code>{#await colorize(submissionDoc.sourceCode, data.languages[submissionDoc.language].monaco)}{submissionDoc.sourceCode}{:then element}{@html element}{:catch error}{submissionDoc.sourceCode}{/await}</code></pre>
		{/if}
	</div>
</div>
