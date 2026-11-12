import { X } from "lucide-react";
import CreatableSelect from "react-select/creatable";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TagWithCount } from "../../_db/queries.server";
import type { EditPageTagsActionState } from "./action";

const DropdownIndicator = () => null;
const IndicatorSeparator = () => null;

export function TagInput({
	tags,
	allTagsWithCount,
	pageId,
	isSaving,
	editState,
	onTagsChange,
	onRetry,
}: {
	tags: string[];
	allTagsWithCount: TagWithCount[];
	pageId: number | undefined;
	isSaving: boolean;
	editState: EditPageTagsActionState;
	onTagsChange: (tags: string[]) => void;
	onRetry: () => void;
}) {
	const t = useTranslations("TagInput");
	const disabled = isSaving || !pageId;
	const error = editState.success
		? null
		: t(
				editState.zodErrors?.tags?.length
					? "invalidTags"
					: editState.zodErrors?.pageId?.length
						? "pageNotFound"
						: "saveFailed",
			);

	return (
		<fieldset aria-labelledby="page-tags-label" className="min-w-0 space-y-2">
			<legend className="text-sm font-medium" id="page-tags-label">
				{t("title")}
			</legend>
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{tags.map((tag) => (
						<div
							className={cn(
								"flex max-w-full items-center gap-1 rounded-full bg-primary px-2 py-1 text-sm text-primary-foreground",
								isSaving && "opacity-50",
							)}
							key={tag}
						>
							<span className="min-w-0 break-all">{tag}</span>
							<button
								aria-label={t("removeTag", { tag })}
								className="shrink-0 rounded-full p-1 hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
								disabled={disabled}
								onClick={() =>
									onTagsChange(tags.filter((name) => name !== tag))
								}
								type="button"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}
			{tags.length < 5 && (
				<CreatableSelect
					aria-describedby="page-tags-help"
					aria-label={t("title")}
					className="min-w-0 w-full text-sm"
					classNames={{
						control: () =>
							cn(
								"min-h-8 w-full cursor-pointer rounded-lg border border-border bg-transparent px-2 focus-within:ring-2 focus-within:ring-ring",
								disabled && "cursor-not-allowed opacity-50",
							),
						valueContainer: () => "min-w-0 py-1",
						placeholder: () => "text-muted-foreground",
						input: () => "m-0 p-0",
						menu: () =>
							"mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md",
						menuList: () => "py-1",
						noOptionsMessage: () => "px-3 py-2 text-muted-foreground",
						option: (state) =>
							cn(
								"break-all px-3 py-2 cursor-pointer",
								state.isFocused && "bg-accent",
							),
					}}
					components={{ DropdownIndicator, IndicatorSeparator }}
					formatCreateLabel={(tag) => t("createTag", { tag })}
					inputId="page-tags-input"
					instanceId="page-tags-input"
					isDisabled={disabled}
					isValidNewOption={(input) =>
						input.length > 0 && !tags.includes(input)
					}
					maxMenuHeight={160}
					menuPlacement="auto"
					noOptionsMessage={() => t("noOptions")}
					onChange={(option) => {
						if (option?.value && !tags.includes(option.value)) {
							onTagsChange([...tags, option.value]);
						}
					}}
					options={allTagsWithCount
						.filter((tag) => !tags.includes(tag.name))
						.map((tag) => ({
							value: tag.name,
							label: `${tag.name} (${tag._count.pages})`,
						}))}
					placeholder={t("placeholder")}
					screenReaderStatus={({ count }) => t("results", { count })}
					unstyled
					value={null}
				/>
			)}
			<p className="text-xs text-muted-foreground" id="page-tags-help">
				{t("help")}
			</p>
			{isSaving && (
				<p className="text-xs text-muted-foreground" role="status">
					{t("saving")}
				</p>
			)}
			{error && (
				<div className="space-y-2" role="alert">
					<p className="text-xs text-destructive">{error}</p>
					<Button
						disabled={disabled}
						onClick={onRetry}
						size="sm"
						type="button"
						variant="outline"
					>
						{t("retry")}
					</Button>
				</div>
			)}
		</fieldset>
	);
}
