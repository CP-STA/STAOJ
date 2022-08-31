<script>
	// @ts-nocheck
	import Header from '$lib/Header.svelte';
	import Footer from '$lib/Footer.svelte';
	import { user } from '$lib/User.svelte';
	import '$lib/firebase';
</script>

<Header />
<div class="container">
	<slot />
</div>

<Footer />
