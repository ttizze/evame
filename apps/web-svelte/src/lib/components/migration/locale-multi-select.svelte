<script lang="ts">
	import { ChevronDown, X } from "@lucide/svelte";
	import { Combobox } from "bits-ui";
	import { supportedLocaleOptions } from "@/app/_constants/locale";

type LocaleItem = {
	value: string;
	label: string;
};

interface Props {
	title: string;
	description?: string;
	maxSelectable?: number;
	name?: string;
	value?: string[];
	onSave?: (value: string[]) => void;
}

	let {
		title,
		description = "",
		maxSelectable = 2,
		name = "",
		value = $bindable<string[]>([]),
		onSave,
	}: Props = $props();

	const localeItems: LocaleItem[] = supportedLocaleOptions.map((locale) => ({
		value: locale.code,
		label: locale.name,
	}));

	let open = $state(false);
	let searchValue = $state("");

	const filteredItems = $derived.by(() =>
		searchValue.trim() === ""
			? localeItems
			: localeItems.filter((item) =>
					item.label.toLowerCase().includes(searchValue.toLowerCase()),
				),
	);

	const selectedItems = $derived.by(() =>
		value
			.map((localeCode) => localeItems.find((item) => item.value === localeCode))
			.filter((item): item is LocaleItem => Boolean(item)),
	);

	const inputValue = $derived(open ? searchValue : "");
	const limitReached = $derived(value.length >= maxSelectable);

	function isDisabled(code: string): boolean {
		return limitReached && !value.includes(code);
	}

	function handleValueChange(next: string[]) {
		const clamped = next.slice(0, maxSelectable);
		value = clamped;
		onSave?.(clamped);
	}

	function remove(code: string) {
		const next = value.filter((localeCode) => localeCode !== code);
		value = next;
		onSave?.(next);
	}
</script>

<section class="locale-select">
	<header class="head">
		<div>
			<h3>{title}</h3>
			{#if description}
				<p>{description}</p>
			{/if}
		</div>
		<small>{value.length} / {maxSelectable}</small>
	</header>

	{#if name}
		<input name={name} type="hidden" value={JSON.stringify(value)} />
	{/if}

	<div class="chips">
		{#each selectedItems as item (item.value)}
			<button
				aria-label={`Remove ${item.label}`}
				class="chip"
				onclick={() => remove(item.value)}
				type="button"
			>
				<span>{item.label}</span>
				<X size={14} />
			</button>
		{/each}
	</div>

	<Combobox.Root
		{inputValue}
		bind:open
		bind:value
		items={localeItems}
		onOpenChange={(next: boolean) => {
			if (!next) {
				searchValue = "";
			}
		}}
		onValueChange={handleValueChange}
		type="multiple"
	>
		<div class="field">
			<Combobox.Input
				class="locale-combobox-input"
				oninput={(event: Event) => {
					searchValue = (event.currentTarget as HTMLInputElement).value;
					open = true;
				}}
				placeholder={`Search locales (max ${maxSelectable})`}
			/>
			<Combobox.Trigger
				aria-label={`${title} selector`}
				class="locale-combobox-trigger"
			>
				<ChevronDown size={16} />
			</Combobox.Trigger>
		</div>

		<Combobox.Portal>
			<Combobox.Content class="locale-combobox-panel" sideOffset={8}>
				<Combobox.Viewport class="locale-combobox-viewport">
					{#if filteredItems.length === 0}
						<p class="empty">No locale found</p>
					{:else}
						{#each filteredItems as item (item.value)}
							<Combobox.Item
								class="locale-combobox-item"
								disabled={isDisabled(item.value)}
								label={item.label}
								value={item.value}
							>
								{item.label}
							</Combobox.Item>
						{/each}
					{/if}
				</Combobox.Viewport>
			</Combobox.Content>
		</Combobox.Portal>
	</Combobox.Root>
</section>

<style>
	.locale-select {
		padding: 1rem;
		border: 1px solid var(--border);
		background: var(--card);
		border-radius: 1rem;
		display: grid;
		gap: 0.75rem;
	}

	.head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
	}

	p {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	small {
		color: var(--muted);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		border-radius: 9999px;
		background: var(--accent-soft);
		color: var(--text);
		padding: 0.25rem 0.6rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.field {
		display: flex;
		gap: 0.5rem;
	}

	:global(.locale-combobox-input) {
		flex: 1;
		height: 2.5rem;
		padding: 0 0.8rem;
		border-radius: 0.8rem;
		border: 1px solid var(--border);
		background: color-mix(in oklab, var(--card) 88%, var(--bg));
		color: var(--text);
	}

	:global(.locale-combobox-trigger) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.8rem;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--text);
		cursor: pointer;
	}

	:global(.locale-combobox-panel) {
		width: min(460px, calc(100vw - 2rem));
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		padding: 0.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
	}

	:global(.locale-combobox-viewport) {
		max-height: 260px;
		overflow: auto;
		display: grid;
		gap: 0.2rem;
	}

	:global(.locale-combobox-item) {
		display: flex;
		align-items: center;
		padding: 0.55rem 0.6rem;
		border-radius: 0.6rem;
		cursor: pointer;
	}

	:global(.locale-combobox-item[data-highlighted]) {
		background: color-mix(in oklab, var(--accent) 14%, transparent);
	}

	:global(.locale-combobox-item[data-selected]) {
		background: color-mix(in oklab, var(--accent) 24%, transparent);
	}

	:global(.locale-combobox-item[data-disabled]) {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.empty {
		margin: 0;
		padding: 1rem 0.8rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
