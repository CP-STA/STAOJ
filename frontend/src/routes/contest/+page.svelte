<script>
	import { time as currentTime } from '$lib/stores';
	/** @type {import('./$types').PageData} */
	export let data;

	const problems = data.problems;

	/** @param {String} dateString*/
	function formatDate(dateString) {
		const options = { year: 'numeric', month: 'long', day: 'numeric' };
		// @ts-ignore
		return new Date(dateString).toLocaleDateString('en-GB', options);
	}

	/** @param {String} dateString*/
	function formatTime(dateString) {
		return new Date(dateString).toLocaleTimeString('en-GB');
	}
	$: isAfterStart = new Date(data.info.startTime) <= $currentTime.date;
	$: isBeforeEnd = $currentTime.date < new Date(data.info.endTime);
	$: isAvaliable = $currentTime.synced && isAfterStart && isBeforeEnd;
</script>

{#if !$currentTime.synced}
	<h1>Loading...</h1>
{:else if isBeforeEnd}
	<h1>{data.info.name}</h1>
	{#if isAvaliable}
		<table class="table">
			<thead>
				<tr>
					<th scope="col">Problem</th>
				</tr>
			</thead>
			<tbody>
				{#each problems as problem}
					<tr>
						<td
							><a sveltekit:prefetch href="/problems/{problem.slug}?contest=true">{problem.name}</a
							></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p>
			This contest will begin at {formatTime(data.info.startTime)} and end at {formatTime(
				data.info.endTime
			)} on {formatDate(data.info.startTime)}
		</p>
	{/if}
{:else}
	<h1>No Upcoming Contest</h1>
	<p>There is no currently scheduled contest at the moment. Follow our facebook to stayed tuned.</p>
{/if}

<style>
</style>
