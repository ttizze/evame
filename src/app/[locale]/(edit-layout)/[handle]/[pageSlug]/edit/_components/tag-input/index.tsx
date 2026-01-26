"use client";

import { X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { cn } from "@/lib/utils";
import type { TagWithCount } from "../../_db/queries.server";
import { type EditPageTagsActionState, editPageTagsAction } from "./action";

interface TagInputProps {
	initialTags: { name: string }[];
	allTagsWithCount: TagWithCount[];
	pageId: number | undefined;
}

const DropdownIndicator = () => null;
const IndicatorSeparator = () => null;

export function TagInput({
	initialTags,
	allTagsWithCount,
	pageId,
}: TagInputProps) {
	const [tags, setTags] = useState<string[]>(
		initialTags.map((tag) => tag.name),
	);
	const formRef = useRef<HTMLFormElement>(null);

	const [editState, editAction, isPending] = useActionState<
		EditPageTagsActionState,
		FormData
	>(editPageTagsAction, { success: false });

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
		<form action={editAction} ref={formRef}>
			<input name="pageId" type="hidden" value={pageId ?? ""} />
			<input
				data-testid="tags-input"
				name="tags"
				type="hidden"
				value={JSON.stringify(tags)}
			/>

			<div className="flex flex-wrap items-center gap-2 pt-2 pb-3">
				{tags.map((tag) => (
					<div
						className={cn(
							"flex items-center gap-1 px-3 h-[32px] bg-primary rounded-full text-sm text-primary-foreground",
							isPending && "opacity-50 cursor-not-allowed",
						)}
						key={tag}
					>
						<button
							className="hover:text-destructive ml-1"
							disabled={isPending}
							onClick={() => handleRemoveTag(tag)}
							type="button"
						>
							<X className="w-3 h-3" />
						</button>
						<span>{tag}</span>
					</div>
				))}
				{tags.length < 5 && (
					<CreatableSelect
						classNames={{
							control: () =>
								cn(
									"border border-border px-4 w-30  rounded-full  bg-transparent cursor-pointer text-sm",
									isPending || (!pageId && "opacity-50 cursor-not-allowed"),
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
						components={{
							DropdownIndicator,
							IndicatorSeparator,
						}}
						instanceId="tags-input"
						isClearable
						isDisabled={isPending || !pageId}
						onChange={(newValue) => {
							if (newValue?.value) {
								handleCreateTag(newValue.value);
							}
						}}
						options={allTagsWithCount
							.filter((tag) => !tags.includes(tag.name))
							.map((tag) => ({
								value: tag.name,
								label: `${tag.name} (${tag._count.pages})`,
							}))}
						placeholder="# Add tags"
						styles={{
							control: () => ({
								height: "32px",
							}),
						}}
						unstyled
						value={null}
					/>
				)}
			</div>
			{!editState.success && editState.zodErrors?.tags && (
				<p className="text-sm text-red-500">{editState.zodErrors.tags}</p>
			)}
			{!editState.success && editState.zodErrors?.pageId && (
				<p className="text-sm text-red-500">Page not found</p>
			)}
		</form>
	);
}
