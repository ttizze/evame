"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";
import { useActionState } from "react";
import CreatableSelect from "react-select/creatable";
import type { ProjectTagWithCount } from "../../_db/tag-queries.server";
import {
	type EditProjectTagsActionState,
	editProjectTagsAction,
} from "./action";

interface ProjectTagInputProps {
	initialTags: { id: string; name: string }[];
	allTagsWithCount: ProjectTagWithCount[];
	projectId: string | undefined;
}

export function ProjectTagInput({
	initialTags,
	allTagsWithCount,
	projectId,
}: ProjectTagInputProps) {
	const [tags, setTags] = useState<string[]>(
		initialTags.map((tag) => tag.name),
	);
	const [editState, editAction, isPending] = useActionState<
		EditProjectTagsActionState,
		FormData
	>(editProjectTagsAction, { success: false });

	const handleCreateTag = (inputValue: string) => {
		if (tags.length < 5) {
			const updatedTags = [...tags, inputValue];
			setTags(updatedTags);
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const updatedTags = tags.filter((tag) => tag !== tagToRemove);
		setTags(updatedTags);
	};

	return (
		<div>
			<input type="hidden" name="projectId" value={projectId ?? ""} />
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
						className={cn(
							"flex items-center gap-1 px-3 h-[32px] bg-primary rounded-full text-sm text-primary-foreground",
							isPending && "opacity-50 cursor-not-allowed",
						)}
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
						instanceId="project-tags-input"
						unstyled
						isDisabled={isPending || !projectId}
						placeholder="# Add tags"
						isClearable
						onChange={(newValue) => {
							if (newValue?.value) {
								handleCreateTag(newValue.value);
							}
						}}
						options={allTagsWithCount
							.filter((tag) => !tags.includes(tag.name))
							.map((tag) => ({
								value: tag.name,
								label: `${tag.name} (${tag._count.projectTagRelations})`,
							}))}
						value={null}
						components={{
							DropdownIndicator: () => null,
							IndicatorSeparator: () => null,
						}}
						styles={{
							control: () => ({
								height: "32px",
							}),
						}}
						classNames={{
							control: () =>
								cn(
									"border border-border px-4 w-30 rounded-full bg-transparent cursor-pointer text-sm",
									isPending || (!projectId && "opacity-50 cursor-not-allowed"),
								),
							valueContainer: () => "w-full",
							placeholder: () => "text-center flex items-center h-[32px]",
							input: () => "m-0 p-0 h-[32px]",
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
			{editState.zodErrors?.tags && (
				<p className="text-sm text-red-500">{editState.zodErrors.tags}</p>
			)}
			{editState.zodErrors?.projectId && (
				<p className="text-sm text-red-500">Project not found</p>
			)}
		</div>
	);
}
