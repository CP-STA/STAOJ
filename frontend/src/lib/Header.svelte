<script>
	import { page } from '$app/stores';
	import { time } from '$lib/stores';
</script>

<header class="d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom mx-3">
	<a
		href="/"
		class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-dark text-decoration-none"
	>
		<svg class="bi me-2" width="40" height="32"><use xlink:href="#bootstrap" /></svg>
		<span class="fs-4">St Andrews Online Judge</span>
	</a>

	<ul class="nav nav-pills">
		<li class="nav-item">
			<a sveltekit:prefetch class="nav-link" href="/" class:active={$page.url.pathname === '/'}
				>Home</a
			>
		</li>
		<li class="nav-item">
			<a
				sveltekit:prefetch
				class="nav-link"
				href="/contest"
				class:active={$page.url.pathname === '/contest'}>Contest</a
			>
		</li>
		<li class="nav-item">
			<a
				sveltekit:prefetch
				class="nav-link"
				href="/past-problems"
				class:active={$page.url.pathname === '/past-problems'}>Past Problems</a
			>
		</li>
		<li class="nav-item">
			<a
				sveltekit:prefetch
				class="nav-link"
				href="/account"
				class:active={$page.url.pathname === '/account'}>Account</a
			>
		</li>
		<li class="nav-item">
			<span
				class:btn-success={$time.synced}
				class:btn-secondary={!$time.synced}
				class="btn pt-2 pb-2 ms-2 border-0 font-monospace"
				>{$time.date.toLocaleTimeString('en-GB')}</span
			>
		</li>
	</ul>
</header>
