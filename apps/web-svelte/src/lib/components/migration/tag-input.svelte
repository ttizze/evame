<script lang="ts">
	import { Hash, Plus, X } from "@lucide/svelte";
	import { Combobox } from "bits-ui";
	import { toast } from "svelte-sonner";

type TagOption = {
	name: string;
	count: number;
};

interface Props {
	title: string;
	description?: string;
	name?: string;
	maxTags?: number;
	options?: TagOption[];
	value?: string[];
	disabled?: boolean;
}

	let {
		title,
		description = "",
		name = "",
		maxTags = 5,
		options = [],
		value = $bindable<string[]>([]),
		disabled = false,
	}: Props = $props();

	const comboboxItems = $derived.by(() =>
		options.map((tag) => ({
			value: tag.name,
			label: `${tag.name} (${tag.count})`,
		})),
	);

	let open = $state(false);
let searchValue = $state("");

	const filteredItems = $derived.by(() =>
		comboboxItems.filter((item) => {
			if (value.includes(item.value)) return false;
			if (searchValue.trim() === "") return true;
			return item.value.toLowerCase().includes(searchValue.toLowerCase());
		}),
	);

	const normalizedSelected = $derived.by(
		() => new Set(value.map((tag) => tag.toLowerCase())),
	);

	const creatableTag = $derived.by(() => {
		const next = searchValue.trim();
		if (next === "") return "";
		if (normalizedSelected.has(next.toLowerCase())) return "";
		return next;
	});

	const inputValue = $derived(open ? searchValue : "");

	function normalizeTags(next: string[]): string[] {
		const unique: string[] = [];
		for (const raw of next) {
			const trimmed = raw.trim();
			if (!trimmed) continue;
			if (unique.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
				continue;
			}
			unique.push(trimmed);
		}
		return unique.slice(0, maxTags);
	}

	function handleValueChange(next: string[]) {
		const normalized = normalizeTags(next);
		value = normalized;
	}

	function addCreatableTag() {
		if (!creatableTag) return;
		if (value.length >= maxTags) {
			toast.error(`タグは最大 ${maxTags} 件までです`);
			return;
		}
		value = [...value, creatableTag];
		searchValue = "";
	}

	function removeTag(tagName: string) {
		value = value.filter((tag) => tag !== tagName);
	}
</script>

<section class="tag-input">
	<header class="head">
		<div>
			<h3>{title}</h3>
			{#if description}
				<p>{description}</p>
			{/if}
		</div>
		<small>{value.length} / {maxTags}</small>
	</header>

	{#if name}
		<input name={name} type="hidden" value={JSON.stringify(value)} />
	{/if}

	<div class="chips">
		{#each value as tagName (tagName)}
			<button
				aria-label={`Remove ${tagName}`}
				class="chip"
				disabled={disabled}
				onclick={() => removeTag(tagName)}
				type="button"
			>
				<Hash size={13} />
				<span>{tagName}</span>
				<X size={13} />
			</button>
		{/each}
	</div>

	<Combobox.Root
		{inputValue}
		bind:open
		bind:value
		items={comboboxItems}
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
				class="tag-combobox-input"
				disabled={disabled || value.length >= maxTags}
				oninput={(event: Event) => {
					searchValue = (event.currentTarget as HTMLInputElement).value;
					open = true;
				}}
				onkeydown={(event: KeyboardEvent) => {
					if (event.key === "Enter") {
						event.preventDefault();
						addCreatableTag();
					}
				}}
				placeholder={value.length >= maxTags
					? "Tag limit reached"
					: "Search or create tag"}
			/>
			<Combobox.Trigger
				aria-label={`${title} selector`}
				class="tag-combobox-trigger"
			>
				<Plus size={16} />
			</Combobox.Trigger>
		</div>

		<Combobox.Portal>
			<Combobox.Content class="tag-combobox-panel" sideOffset={8}>
				<Combobox.Viewport class="tag-combobox-viewport">
					{#if creatableTag}
						<button class="create-row" onclick={addCreatableTag} type="button">
							<Plus size={14} />
							<span>Create "{creatableTag}"</span>
						</button>
					{/if}

					{#if filteredItems.length === 0}
						<p class="empty">No suggested tags</p>
					{:else}
						{#each filteredItems as item (item.value)}
							<Combobox.Item
								class="tag-combobox-item"
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
	.tag-input {
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
		gap: 0.45rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		border: none;
		border-radius: 9999px;
		background: var(--accent-soft);
		color: var(--text);
		padding: 0.24rem 0.6rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.field {
		display: flex;
		gap: 0.5rem;
	}

	:global(.tag-combobox-input) {
		flex: 1;
		height: 2.5rem;
		padding: 0 0.8rem;
		border-radius: 0.8rem;
		border: 1px solid var(--border);
		background: color-mix(in oklab, var(--card) 88%, var(--bg));
		color: var(--text);
	}

	:global(.tag-combobox-trigger) {
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

	:global(.tag-combobox-panel) {
		width: min(460px, calc(100vw - 2rem));
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 0.9rem;
		padding: 0.4rem;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
	}

	:global(.tag-combobox-viewport) {
		max-height: 260px;
		overflow: auto;
		display: grid;
		gap: 0.2rem;
	}

	.create-row {
		border: none;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.6rem;
		border-radius: 0.6rem;
		background: color-mix(in oklab, var(--accent) 14%, transparent);
		color: var(--text);
		cursor: pointer;
	}

	:global(.tag-combobox-item) {
		display: flex;
		align-items: center;
		padding: 0.55rem 0.6rem;
		border-radius: 0.6rem;
		cursor: pointer;
	}

	:global(.tag-combobox-item[data-highlighted]) {
		background: color-mix(in oklab, var(--accent) 14%, transparent);
	}

	:global(.tag-combobox-item[data-selected]) {
		background: color-mix(in oklab, var(--accent) 24%, transparent);
	}

	.empty {
		margin: 0;
		padding: 1rem 0.8rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
