<script>
	/** @type {import('./$types').PageData} */
	export let data;

	/** @param {Date} date */
	const formatDate = (date) => {
		const options = { year: 'numeric', month: 'long', day: 'numeric' };
		// @ts-ignore
		return date.toLocaleDateString(undefined, options);
	};
</script>

<h1>Past Problems</h1>

<table class="table">
	<thead>
		<tr>
			<th scope="col">Problem</th>
			<th scope="col">Date</th>
			<th scope="col">Difficulty</th>
		</tr>
	</thead>
	<tbody>
		{#each data as problem}
			<tr>
				<td><a sveltekit:prefetch href="/problems/{problem.slug}">{problem.name}</a></td>
				<td>{formatDate(new Date(problem.date))}</td>
				<td>{problem.difficulty}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
</style>
