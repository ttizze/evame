<main class="page">
	<section class="hero">
		<p class="eyebrow">Cloudflare + SvelteKit Migration</p>
		<h1>最終フェーズ実装ライン</h1>
		<p class="lead">
			既存 Next API を SvelteKit `+server.ts` へ移植しつつ、React専用だったセレクトUIを
			Bits UI ベースへ置換した検証環境です。
		</p>
		<div class="actions">
			<a class="cta primary" href="/migration/selects">Select 置換デモを見る</a>
			<a class="cta" href="/api/health">API Health を確認</a>
		</div>
	</section>
</main>

<style>
	.page {
		max-width: 1120px;
		margin: 0 auto;
		padding: 3.4rem 1.25rem 4rem;
	}

	.hero {
		padding: 1.6rem;
		border: 1px solid var(--border);
		background: linear-gradient(
			140deg,
			color-mix(in oklab, var(--card) 92%, var(--accent-soft)),
			var(--card)
		);
		border-radius: 1.2rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
	}

	h1 {
		margin: 0.3rem 0 0;
		font-size: clamp(1.5rem, 3vw, 2.2rem);
	}

	.lead {
		margin: 0.8rem 0 0;
		color: var(--muted);
		line-height: 1.7;
		max-width: 75ch;
	}

	.actions {
		margin-top: 1.2rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.cta {
		border: 1px solid var(--border);
		background: var(--card);
		padding: 0.58rem 0.9rem;
		border-radius: 0.75rem;
		text-decoration: none;
		font-size: 0.92rem;
	}

	.cta.primary {
		border-color: var(--accent);
		background: var(--accent);
		color: white;
	}
</style>
