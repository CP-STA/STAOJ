<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { time, judgeCount } from '$lib/stores';
	import { browser } from '$app/environment';
</script>

<header class="d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom mx-3">
	<a
		href="/"
		class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-dark text-decoration-none"
	>
		<svg class="bi me-2" width="40" height="32"><use xlink:href="#bootstrap" /></svg>
		<span class="fs-4">St Andrews Online Judge</span>
	</a>

	<ul class="nav">
		<li class="nav-item">
			<a
				href="/"
				class="nav-link btn-hover"
				class:btn={$page.url.pathname === '/'}
				class:btn-outline-primary={$page.url.pathname === '/'}>About</a
			>
		</li>
		<li class="nav-item">
			<a
				class="nav-link btn-hover"
				href="/contest"
				class:btn={$page.url.pathname === '/contest'}
				class:btn-outline-primary={$page.url.pathname === '/contest'}>Contest</a
			>
		</li>
		<li class="nav-item">
			<a
				class="nav-link btn-hover"
				href="/past-problems"
				class:btn={$page.url.pathname === '/past-problems'}
				class:btn-outline-primary={$page.url.pathname === '/past-problems'}>Past Problems</a
			>
		</li>
		<li class="nav-item">
			<a
				class="nav-link btn-hover"
				href="/standings"
				class:btn={$page.url.pathname === '/standings'}
				class:btn-outline-primary={$page.url.pathname === '/standings'}>Standings</a
			>
		</li>
		<li class="nav-item">
			<a
				class="nav-link btn-hover"
				href="/account"
				class:btn={$page.url.pathname === '/account'}
				class:btn-outline-primary={$page.url.pathname === '/account'}>Account</a
			>
		</li>
	</ul>
</header>

<style>
	.btn {
		border: unset;
		outline: 1px solid;
	}
	.btn:hover {
		color: unset;
		background-color: unset;
	}
</style>
