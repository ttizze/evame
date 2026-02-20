<script lang="ts">
	import LocaleMultiSelect from "$lib/components/migration/locale-multi-select.svelte";
	import TagInput from "$lib/components/migration/tag-input.svelte";
	import { toast } from "svelte-sonner";

	const localeTagOptions = [
		{ name: "Buddhism", count: 242 },
		{ name: "Meditation", count: 151 },
		{ name: "Pali", count: 83 },
		{ name: "Dhamma", count: 176 },
		{ name: "Tipitaka", count: 97 },
		{ name: "Vinaya", count: 41 },
		{ name: "Sutta", count: 59 },
	];

	let headerLocales = $state<string[]>(["en"]);
	let settingsLocales = $state<string[]>(["en", "ja"]);
	let tags = $state<string[]>(["Buddhism", "Dhamma"]);

	function saveHeaderLocales(next: string[]) {
		toast.success(`Header locales saved: ${next.join(", ") || "none"}`);
	}

	function saveSettingsLocales(next: string[]) {
		toast.success(`Settings locales saved: ${next.join(", ") || "none"}`);
	}
</script>

<main class="page">
	<section class="intro">
		<h1>React Select 置換デモ</h1>
		<p>
			`react-select` / `react-select/creatable` を使っていた機能を、Svelte +
			Bits UI 実装へ置換した版です。
		</p>
	</section>

	<section class="grid">
		<LocaleMultiSelect
			bind:value={headerLocales}
			description="ヘッダーのロケール複数選択。保存時に toast を表示。"
			maxSelectable={2}
			name="headerLocales"
			onSave={saveHeaderLocales}
			title="Header Locale Multi Selector"
		/>

		<LocaleMultiSelect
			bind:value={settingsLocales}
			description="翻訳設定のターゲット言語選択。最大4件。"
			maxSelectable={4}
			name="settingsLocales"
			onSave={saveSettingsLocales}
			title="Translation Settings Locale Selector"
		/>

		<TagInput
			bind:value={tags}
			description="候補から選択 + Enter で新規タグ作成（最大5件）。"
			maxTags={5}
			name="tags"
			options={localeTagOptions}
			title="Creatable Tag Input"
		/>
	</section>
</main>

<style>
	.page {
		max-width: 1120px;
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
		display: grid;
		gap: 1.2rem;
	}

	.intro {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.2rem;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.3rem, 2.3vw, 1.8rem);
	}

	p {
		margin: 0.5rem 0 0;
		color: var(--muted);
		line-height: 1.6;
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.grid :global(section:last-child) {
		grid-column: 1 / -1;
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
