import type { FieldMetadata } from "@conform-to/react";
import type { Tag } from "@prisma/client";
import { X } from "lucide-react";
import { useState } from "react";
import CreatableSelect from "react-select/creatable";
import type { z } from "zod";
import { cn } from "~/utils/cn";
import type { editPageSchema } from "../_edit";

interface TagInputProps {
	tagsMeta: FieldMetadata<z.infer<typeof editPageSchema>["tags"]>;
	initialTags: { id: number; name: string }[];
	allTags: Tag[];
	onTagsChange: (tags: string[]) => void;
}

export function TagInput({
	tagsMeta,
	initialTags,
	allTags,
	onTagsChange,
}: TagInputProps) {
	const [tags, setTags] = useState<string[]>(
		initialTags.map((tag) => tag.name),
	);

	const handleCreateTag = (inputValue: string) => {
		if (tags.length < 5) {
			const updatedTags = [...tags, inputValue];
			setTags(updatedTags);
			onTagsChange(updatedTags);
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const updatedTags = tags.filter((tag) => tag !== tagToRemove);
		setTags(updatedTags);
		onTagsChange(updatedTags);
	};

	return (
		<div className="flex flex-wrap items-center gap-2 pt-2 pb-3">
			{tags.map((tag) => (
				<div
					key={tag}
					className="flex items-center gap-1 px-3 h-[32px] bg-primary rounded-full text-sm text-primary-foreground"
				>
					<button
						type="button"
						onClick={() => handleRemoveTag(tag)}
						className="hover:text-destructive ml-1"
					>
						<X className="w-3 h-3" />
					</button>
					<span>{tag}</span>
				</div>
			))}
			{tags.length < 5 && (
				<CreatableSelect
					unstyled
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
			{tagsMeta.allErrors && (
				<div>
					{Object.entries(tagsMeta.allErrors).map(([key, errors]) => (
						<div key={key}>
							{errors.map((error) => (
								<p key={error} className="!m-0 text-sm text-destructive">
									{error}
								</p>
							))}
						</div>
					))}
				</div>
			)}
			{tags.map((tag, index) => (
				<input
					key={tag}
					type="hidden"
					name={`${tagsMeta.name}[${index}]`}
					value={tag}
				/>
			))}
		</div>
	);
}
