<script>
	import { page } from '$app/stores';
	import { db } from '$lib/firebase';
	import { query, onSnapshot, orderBy, collection, doc, limit } from 'firebase/firestore';
	import { browser } from '$app/env';
	import { getVerdict } from '$lib/utils';
	/** @type string */
	const id = $page.params.id;
	const q = query(collection(db, 'submissions', id, 'judge-results'), orderBy('judgeTime', 'asc'));
	const isConest = $page.url.searchParams.get('contest') == 'true';
	/** @type any[] */
	let judgeResults = [];
	/** @type {{ [x: number]: { verdict: string; subtask: number; memory: number; time: number, color: string}; }} */
	let testCasesResults = {};
	let resultMap = {
		accepted: 'Accepted',
		TLE: 'Time Limit Execeded',
		MLE: 'Memory Limit Execeded',
		error: 'Runtime Errror',
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
	let problemStatement;
	let verdict = 'Loading...';
	let verdictColor = 'dark';
	/** @type {import("@firebase/firestore").DocumentData} */
	let mostRecentResult;
	$: {
		({ verdict, verdictColor } = getVerdict(submissionDoc));
	}

	if (browser && true) {
		onSnapshot(
			query(
				collection(db, 'submissions', id, 'judge-results'),
				orderBy('judgeTime', 'desc'),
				limit(1)
			),
			(snapshot) => {
				snapshot.forEach((doc) => (mostRecentResult = doc.data()));
			}
		);
		onSnapshot(q, (snapshot) => {
			/** @type any[] */
			let newJudgeResults = [];
			snapshot.forEach((document) => {
				newJudgeResults.push(document.data());
				if (document.data().state == 'testing') {
					// @ts-ignore
					testCasesResults[document.data().testCase] = {
						verdict: 'Testing',
						memory: 0,
						time: 0,
						subtask: document.data().subtask,
						color: 'dark'
					};
				} else if (document.data().state == 'tested') {
					// @ts-ignore
					testCasesResults[document.data().testCase] = {
						verdict: resultMap[document.data().result],
						memory: document.data().memory,
						time: document.data().time,
						subtask: document.data().subtask,
						color: resultColorMap[document.data().result]
					};
				}
			});
			judgeResults = newJudgeResults;
		});
		onSnapshot(doc(db, 'submissions', id), (doc) => {
			submissionDoc = doc.data();
		});
	}
</script>

<h1>Submission {id}</h1>
<p>
	For problem {#if submissionDoc}<a href="/problems/{submissionDoc.problem}"
			>{submissionDoc.problemName}</a
		>{:else}{'['}loading...{']'}{/if}
</p>
<h2>Verdict: <span class="text-{verdictColor}"> {verdict} </span></h2>

<table class="table">
	<tr>
		<th scope="col"># Test Case</th>
		{#if submissionDoc && submissionDoc.subtasksCount != 0}<th scope="col"># Subtask</th>{/if}
		<th scope="col" class="text-end">Time(ms)</th>
		<th scope="col" class="text-end">Memory(kb)</th>
		<th scope="col" class="text-center">Verdict</th>
	</tr>
	{#if testCasesResults}
		{#each Object.entries(testCasesResults) as [i, testCaseResult]}
			<tr>
				<th scope="row">{i}</th>
				{#if submissionDoc && submissionDoc.subtasksCount != 0}<td>{testCaseResult.subtask}</td
					>{/if}
				<td class="text-end">{testCaseResult.time ? testCaseResult.time : ''}</td>
				<td class="text-end">{testCaseResult.memory ? testCaseResult.memory : ''}</td>
				<td class="text-center text-{testCaseResult.color}">{testCaseResult.verdict}</td>
			</tr>
		{/each}
	{/if}
</table>