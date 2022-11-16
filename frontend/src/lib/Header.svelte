<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { time, judgeCount } from '$lib/stores';
	import { browser } from '$app/environment';
	import Clock from '$lib/Clock.svelte';
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
			<a class="nav-link" href="/" class:active={$page.url.pathname === '/'}>About</a>
		</li>
		<li class="nav-item">
			<a class="nav-link" href="/contest" class:active={$page.url.pathname === '/contest'}
				>Contest</a
			>
		</li>
		<li class="nav-item">
			<a
				class="nav-link"
				href="/past-problems"
				class:active={$page.url.pathname === '/past-problems'}>Past Problems</a
			>
		</li>
		<li class="nav-item">
			<a class="nav-link" href="/standings" class:active={$page.url.pathname === '/standings'}
				>Standings</a
			>
		</li>
		<li class="nav-item">
			<a class="nav-link" href="/account" class:active={$page.url.pathname === '/account'}
				>Account</a
			>
		</li>
		<li class="nav-item">
			<Clock time={$time} judgeCount={$judgeCount} />
		</li>
	</ul>
</header>
