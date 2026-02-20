<script lang="ts">
	import { Moon, Sun } from "@lucide/svelte";
	import { ModeWatcher, mode, toggleMode } from "mode-watcher";
	import { Toaster } from "svelte-sonner";
	import "../app.css";

	let { children } = $props();
</script>

<ModeWatcher defaultMode="system" themeColors={{ dark: "#0b1020", light: "#f4f7fb" }} />
<Toaster position="top-right" richColors />

<div class="shell">
	<header class="top">
		<a class="brand" href="/">EVAME SvelteKit</a>
		<nav>
			<a href="/">Home</a>
			<a href="/migration/selects">Select Migration</a>
			<a href="/api/health">API Health</a>
		</nav>
		<button
			aria-label="Toggle theme"
			class="mode"
			onclick={toggleMode}
			type="button"
		>
			{#if mode.current === "dark"}
				<Sun size={16} />
			{:else}
				<Moon size={16} />
			{/if}
		</button>
	</header>

	{@render children()}
</div>

<style>
	.shell {
		min-height: 100dvh;
	}

	.top {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: space-between;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--border);
		background: color-mix(in oklab, var(--bg) 84%, transparent);
		backdrop-filter: blur(14px);
	}

	.brand {
		font-weight: 700;
		letter-spacing: 0.02em;
		text-decoration: none;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.92rem;
	}

	nav a {
		color: var(--muted);
		text-decoration: none;
	}

	nav a:hover {
		color: var(--text);
	}

	.mode {
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--text);
		width: 2rem;
		height: 2rem;
		border-radius: 0.6rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	@media (max-width: 780px) {
		.top {
			flex-wrap: wrap;
		}

		nav {
			order: 3;
			width: 100%;
			overflow: auto;
			padding-bottom: 0.2rem;
		}
	}
</style>
