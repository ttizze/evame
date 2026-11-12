import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	CloudCheck,
	Copy,
	Globe,
	LanguagesIcon,
	LinkIcon,
	Loader2,
	Lock,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { callReaderAction } from "@/app/_service/reader-action";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { UserMenu } from "@/app/[locale]/(common-layout)/_components/header/user-menu.client";
import type { SanitizedUser } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { PageStatus } from "@/db/types";
import type { TagWithCount } from "../../_db/queries.server";
import { TagInput } from "../tag-input";
import {
	type EditPageTagsActionState,
	editPageTags,
} from "../tag-input/action";
import { editPageStatus } from "./action";
import { EditHelpPopover } from "./edit-help-popover.client";
import { useHeaderVisibility } from "./hooks/use-header-visibility";
import { TranslationSettings } from "./translation-settings";
import type { TranslationContext } from "./translation-settings/types";

interface EditHeaderProps {
	currentUser: SanitizedUser;
	initialStatus: PageStatus;
	initialCommentsEnabled: boolean;
	initialTags: { name: string }[];
	allTagsWithCount: TagWithCount[];
	hasUnsavedChanges: boolean;
	isSaving: boolean;
	pageId: number | undefined;
	pageSlug: string;
	handle: string;
	locale: string;
	targetLocales: string[];
	translationContexts: TranslationContext[];
}

const ICON_CLASSES = "w-4 h-4";
const ICON_SPIN_CLASSES = `${ICON_CLASSES} animate-spin`;

function SaveButton({
	hasUnsavedChanges,
	isSaving,
}: {
	hasUnsavedChanges: boolean;
	isSaving: boolean;
}) {
	const t = useTranslations("PublicationSettings");
	return (
		<Button
			aria-label={t("save")}
			className="rounded-full hover:bg-secondary/80"
			data-testid="save-button"
			disabled={!hasUnsavedChanges || isSaving}
			form="edit-page-form"
			size="sm"
			type="submit"
			variant="ghost"
		>
			{hasUnsavedChanges || isSaving ? (
				<Loader2 className={ICON_SPIN_CLASSES} />
			) : (
				<CloudCheck className={ICON_CLASSES} data-testid="save-button-check" />
			)}
		</Button>
	);
}

export function EditHeader({
	currentUser,
	initialStatus,
	initialCommentsEnabled,
	initialTags,
	allTagsWithCount,
	hasUnsavedChanges,
	isSaving,
	pageId,
	pageSlug,
	handle,
	locale,
	targetLocales,
	translationContexts,
}: EditHeaderProps) {
	const t = useTranslations("PublicationSettings");
	const [status, setStatus] = useState<PageStatus>(initialStatus);
	const [commentsEnabled, setCommentsEnabled] = useState(
		initialCommentsEnabled,
	);
	const [jobs, setJobs] = useState<TranslationJobForToast[]>([]);
	const [tags, setTags] = useState(initialTags.map((tag) => tag.name));
	const [tagEditState, setTagEditState] = useState<EditPageTagsActionState>({
		success: true,
		data: undefined,
	});
	const [areTagsSaving, setAreTagsSaving] = useState(false);
	const editPageTagsFn = useServerFn(editPageTags);
	const [isPending, startTransition] = useTransition();
	const editPageStatusFn = useServerFn(editPageStatus);
	const [locales, setLocales] = useState<string[]>(
		targetLocales.length > 0 ? targetLocales : ["en", "zh"],
	);
	const [selectedContextId, setSelectedContextId] = useState<number | null>(
		null,
	);
	const { isVisible } = useHeaderVisibility();
	const { toastJobs } = useTranslationJobs(jobs);
	useTranslationJobToast(toastJobs);

	const maxSelectableLocales =
		currentUser.plan?.toLowerCase?.() === "premium" ? 4 : 2;
	const isPublic = status === "PUBLIC";
	const isProcessing = isPending || isSaving;
	const statusLabel = t(
		isProcessing ? "processing" : isPublic ? "public" : "private",
	);

	const submitStatus = (nextStatus: PageStatus) => {
		if (
			!pageId ||
			isProcessing ||
			(nextStatus === "PUBLIC" && hasUnsavedChanges)
		)
			return;
		const formData = new FormData();
		formData.set("pageId", String(pageId));
		formData.set("status", nextStatus);
		formData.set("targetLocales", locales.join(","));
		if (selectedContextId !== null) {
			formData.set("translationContextId", String(selectedContextId));
		}
		startTransition(async () => {
			try {
				const result = await editPageStatusFn({ data: formData });
				if (!result.success) {
					toast.error(t("failed"));
					return;
				}
				setStatus(nextStatus);
				setJobs(result.data?.translationJobs ?? []);
			} catch {
				toast.error(t("failed"));
			}
		});
	};

	const saveTags = async (nextTags: string[]) => {
		if (!pageId || areTagsSaving) return;
		setTags(nextTags);
		setAreTagsSaving(true);
		setTagEditState({ success: true, data: undefined });
		const formData = new FormData();
		formData.set("pageId", String(pageId));
		formData.set("tags", JSON.stringify(nextTags));
		try {
			setTagEditState(await editPageTagsFn({ data: formData }));
		} catch {
			setTagEditState({ success: false });
		} finally {
			setAreTagsSaving(false);
		}
	};

	const statusIcon = isProcessing ? (
		<Loader2 className={ICON_SPIN_CLASSES} />
	) : isPublic ? (
		<Globe className={ICON_CLASSES} />
	) : (
		<Lock className={ICON_CLASSES} />
	);

	return (
		<div
			className={`sticky top-0 z-50 transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
		>
			<header className="z-50 bg-background rounded-b-3xl max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center">
				<div className="flex items-center gap-4">
					<Link
						className="flex items-center"
						params={{ locale }}
						reloadDocument
						to="/$locale"
					>
						<img
							alt="Evame"
							aria-label="Evame Logo"
							className="h-8 w-8 dark:invert md:hidden"
							height={32}
							src="/favicon.svg"
							width={32}
						/>
						<img
							alt="Evame"
							aria-label="Evame Logo"
							className="h-8 w-20 dark:invert hidden md:block"
							height={32}
							src="/logo.svg"
							width={80}
						/>
					</Link>
					<SaveButton
						hasUnsavedChanges={hasUnsavedChanges}
						isSaving={isSaving}
					/>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<EditHelpPopover />
						<Popover>
							<PopoverTrigger asChild>
								<Button
									aria-label={t("openSettings", {
										status: statusLabel,
									})}
									className="flex items-center gap-2 rounded-full transition-colors justify-start duration-200"
									disabled={isProcessing || !pageId}
									size="sm"
									variant={isPublic ? "default" : "secondary"}
								>
									{statusIcon}
									<span>{statusLabel}</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="end"
								aria-label={t("title")}
								className="w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl p-4 space-y-4"
							>
								<div className="space-y-2">
									<p className="text-sm font-medium">{t("visibility")}</p>
									<div className="flex gap-2">
										<Button
											aria-pressed={!isPublic}
											className="flex-1 gap-2"
											disabled={!isPublic || isProcessing}
											onClick={() => submitStatus("DRAFT")}
											type="button"
											variant={isPublic ? "outline" : "secondary"}
										>
											<Lock className={ICON_CLASSES} />
											{t("private")}
										</Button>
										<Button
											aria-pressed={isPublic}
											className="flex-1 gap-2"
											disabled={isPublic || isProcessing || hasUnsavedChanges}
											onClick={() => submitStatus("PUBLIC")}
											type="button"
											variant={isPublic ? "secondary" : "outline"}
										>
											<Globe className={ICON_CLASSES} />
											{t(isPublic ? "public" : "publish")}
										</Button>
									</div>
									<p className="text-xs text-muted-foreground">
										{t(isPublic ? "publicHelp" : "privateHelp")}
									</p>
								</div>
								<Separator />
								<TagInput
									allTagsWithCount={allTagsWithCount}
									editState={tagEditState}
									isSaving={areTagsSaving}
									onRetry={() => saveTags(tags)}
									onTagsChange={saveTags}
									pageId={pageId}
									tags={tags}
								/>
								<Separator />
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{t("translation")}</p>
										<div className="flex items-center gap-2">
											<TranslationSettings
												initialContexts={translationContexts}
												locales={locales}
												maxSelectableLocales={maxSelectableLocales}
												onContextChange={setSelectedContextId}
												onLocalesChange={setLocales}
												selectedContextId={selectedContextId}
											/>
											<Button
												className="gap-2"
												disabled={
													!isPublic || isProcessing || hasUnsavedChanges
												}
												onClick={() => submitStatus("PUBLIC")}
												size="sm"
												type="button"
												variant="outline"
											>
												<LanguagesIcon className={ICON_CLASSES} />
												{t("translate")}
											</Button>
										</div>
									</div>
									<p className="text-xs text-muted-foreground">
										{t(hasUnsavedChanges ? "waitForSave" : "translationHelp")}
									</p>
								</div>
								<Separator />
								<div className="space-y-2">
									<div className="flex items-center justify-between gap-3">
										<label
											className="text-sm font-medium cursor-pointer"
											htmlFor="page-comments-enabled"
										>
											{t("comments")}
										</label>
										<Switch
											checked={commentsEnabled}
											disabled={isProcessing}
											id="page-comments-enabled"
											onCheckedChange={(enabled) => {
												if (!pageId || isProcessing) return;
												startTransition(async () => {
													try {
														const result = await callReaderAction(
															"pageComments",
															{
																pageId,
																enabled,
																locale,
															},
														);
														if (result.success)
															setCommentsEnabled(result.data.commentsEnabled);
														else toast.error(t("failed"));
													} catch {
														toast.error(t("failed"));
													}
												});
											}}
										/>
									</div>
									<p className="text-xs text-muted-foreground">
										{t("commentsHelp")}
									</p>
								</div>
								<Separator />
								<div className="grid grid-cols-1 gap-2">
									<Button asChild className="gap-2" size="sm" variant="outline">
										<Link
											params={{ handle, locale, pageSlug }}
											reloadDocument
											to="/$locale/$handle/$pageSlug"
										>
											<LinkIcon className={ICON_CLASSES} />
											{t("preview")}
										</Link>
									</Button>
									{isPublic && (
										<Button
											className="gap-2"
											onClick={async () => {
												try {
													await navigator.clipboard.writeText(
														`${window.location.origin}/${locale}/${handle}/${pageSlug}`,
													);
													toast.success(t("copied"));
												} catch {
													toast.error(t("copyFailed"));
												}
											}}
											size="sm"
											type="button"
											variant="outline"
										>
											<Copy className={ICON_CLASSES} />
											{t("copyLink")}
										</Button>
									)}
								</div>
							</PopoverContent>
						</Popover>
					</div>
					<UserMenu
						currentUser={currentUser}
						hasGeminiApiKey={false}
						locale={locale}
					/>
				</div>
			</header>
		</div>
	);
}
