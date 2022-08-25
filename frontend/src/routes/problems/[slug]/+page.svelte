<script>
	// @ts-nocheck

	import katex from 'katex/dist/katex.mjs';

	/** @param {String} s*/
	function katexString(s) {
		return s
			.replaceAll(/\$\$(.+?)\$\$/g, (match, capture) => {
				return katex.renderToString(capture, { displayMode: true, throwOnError: false });
			})
			.replaceAll(/\$(.+?)\$/g, (match, capture) => {
				return katex.renderToString(capture, { throwOnError: false });
			});
	}

	/** @type {import('./$types').PageData} */
	export let data;
	import { page } from '$app/stores';
	import CodeInput from '$lib/Submission.svelte';
	let slug = $page.params.slug;
</script>

<h1 class="text-center">{data.problem.name}</h1>
<p class="text-center">By {data.problem.author}</p>
<div class="container">
	<div class="row align-items-start">
		<div class="col text-end">
			Time: {data.problem.time} ms
		</div>
		<div class="col text-start">
			Memory: {data.problem.memory} kb
		</div>
	</div>
</div>
<CodeInput languages={data.languages} problem={slug} />
<h2>Problem Statement</h2>
<p>
	{@html katexString(data.problem.statement)}
</p>
<h2>Constraints</h2>
<p>{@html katexString(data.problem.constraints)}</p>

{#if data.problem.subtasks}
	{#each data.problem.subtasks as subtask, i}
		<h3>
			Subtask {i + 1} ({subtask.score * 100}%)
		</h3>
		<p>
			{@html katexString(subtask.constraints)}
		</p>
	{/each}
{/if}

<h2>Examples</h2>
{#each data.problem.examples as example}
	<div class="card my-3">
		<div class="card-body">
			<h3>Input</h3>
			<div class="card">
				<div class="card-body">
					<code>{example.input}</code>
				</div>
			</div>
			<h3>Output</h3>
			<div class="card">
				<div class="card-body">
					<code>{example.output}</code>
				</div>
			</div>
		</div>
	</div>
{/each}
