<script>
	// @ts-nocheck
	import Header from '$lib/Header.svelte';
	import { user } from '$lib/User.svelte';
	import '$lib/firebase';
</script>

<Header />
<div class="container py-4 px-3 mx-auto">
	<slot />
</div>
