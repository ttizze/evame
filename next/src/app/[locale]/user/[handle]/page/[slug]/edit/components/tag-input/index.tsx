"use client";

import { cn } from "@/lib/utils";
import type { Tag } from "@prisma/client";
import { X } from "lucide-react";
import { useState } from "react";
import { useActionState } from "react";
import { useRef } from "react";
import CreatableSelect from "react-select/creatable";
import { type EditPageTagsActionState, editPageTagsAction } from "./action";
interface TagInputProps {
	initialTags: { id: number; name: string }[];
	allTags: Tag[];
	pageId: number | undefined;
}

export function TagInput({ initialTags, allTags, pageId }: TagInputProps) {
	const [tags, setTags] = useState<string[]>(
		initialTags.map((tag) => tag.name),
	);
	const formRef = useRef<HTMLFormElement>(null);

	const [editState, editAction, isPending] = useActionState<
		EditPageTagsActionState,
		FormData
	>(editPageTagsAction, {});

	const handleCreateTag = (inputValue: string) => {
		if (tags.length < 5) {
			const updatedTags = [...tags, inputValue];
			setTags(updatedTags);
			setTimeout(() => {
				formRef.current?.requestSubmit();
			}, 0);
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const updatedTags = tags.filter((tag) => tag !== tagToRemove);
		setTags(updatedTags);
		setTimeout(() => {
			formRef.current?.requestSubmit();
		}, 0);
	};

	return (
		<form ref={formRef} action={editAction}>
			<input type="hidden" name="pageId" value={pageId} />
			<input
				type="hidden"
				name="tags"
				value={JSON.stringify(tags)}
				data-testid="tags-input"
			/>

			<div className="flex flex-wrap items-center gap-2 pt-2 pb-3">
				{tags.map((tag) => (
					<div
						key={tag}
						className="flex items-center gap-1 px-3 h-[32px] bg-primary rounded-full text-sm text-primary-foreground"
					>
						<button
							type="button"
							onClick={() => handleRemoveTag(tag)}
							disabled={isPending}
							className="hover:text-destructive ml-1"
						>
							<X className="w-3 h-3" />
						</button>
						<span>{tag}</span>
					</div>
				))}
				{tags.length < 5 && (
					<CreatableSelect
						instanceId="tags-input"
						unstyled
						isDisabled={isPending}
						placeholder="# Add tags"
						isClearable
						onChange={(newValue) => {
							if (newValue?.value) {
								handleCreateTag(newValue.value);
							}
						}}
						options={allTags
							.filter((tag) => !tags.includes(tag.name))
							.map((tag) => ({
								value: tag.name,
								label: tag.name,
							}))}
						value={null}
						components={{
							DropdownIndicator: () => null,
							IndicatorSeparator: () => null,
						}}
						styles={{
							control: (baseStyles) => ({
								height: "32px",
							}),
						}}
						classNames={{
							control: (state) =>
								cn(
									"border border-border px-4 w-30  rounded-full  bg-transparent cursor-pointer text-sm",
									isPending && "opacity-50 cursor-not-allowed",
								),
							valueContainer: () => "w-full",
							placeholder: () => " text-center flex items-center h-[32px]",
							input: () => "m-0 p-0   h-[32px]",
							menu: () =>
								"bg-popover border border-border rounded-lg mt-2 w-50 rounded-sm min-w-60",
							option: (state) =>
								cn(
									"px-4 py-2 cursor-pointer w-40",
									state.isFocused && "bg-accent",
								),
						}}
					/>
				)}
			</div>
			{editState.fieldErrors?.tags && (
				<p className="text-sm text-red-500">{editState.fieldErrors.tags}</p>
			)}
		</form>
	);
}
