"use client";
import {
	Cloud,
	CloudCheck,
	Globe,
	LanguagesIcon,
	LinkIcon,
	Loader2,
	Lock,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useParams } from "next/navigation";
import { type ReactNode, useActionState, useState } from "react";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import { UserMenu } from "@/app/[locale]/(common-layout)/_components/header/user-menu.client";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { PageStatus } from "@/db/types";
import { Link } from "@/i18n/routing";
import { type EditPageStatusActionState, editPageStatusAction } from "./action";
import { EditHelpPopover } from "./edit-help-popover.client";
import { useHeaderVisibility } from "./hooks/use-header-visibility";
import { TranslationSettings } from "./translation-settings";
import type { TranslationContext } from "./translation-settings/types";

interface EditHeaderProps {
	currentUser: SanitizedUser;
	initialStatus: PageStatus;
	hasUnsavedChanges: boolean;
	isSaving: boolean;
	pageId: number | undefined;
	targetLocales: string[];
	translationContexts: TranslationContext[];
}
const BUTTON_BASE_CLASSES =
	"flex items-center gap-2 rounded-full transition-colors justify-start duration-200";
const MENU_BUTTON_CLASSES = `${BUTTON_BASE_CLASSES} text-sm px-3 py-2 cursor-pointer hover:bg-transparent disabled:opacity-50 disabled:pointer-events-none `;
const ICON_CLASSES = "w-4 h-4";
const ICON_SPIN_CLASSES = `${ICON_CLASSES} animate-spin`;
const PROCESSING_TEXT = "Processing...";

interface EditHeaderShellProps {
	currentUser: SanitizedUser;
	leftExtra?: ReactNode;
	rightExtra?: ReactNode;
}

function EditHeaderShell({
	currentUser,
	leftExtra,
	rightExtra,
}: EditHeaderShellProps) {
	return (
		<header className="z-50 bg-background rounded-b-3xl max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center">
			<div className="flex items-center gap-4">
				<Link className="flex items-center" href="/">
					<Image
						alt="Evame"
						aria-label="Evame Logo"
						className="h-8 w-8 dark:invert md:hidden"
						height={32}
						src="/favicon.svg"
						width={32}
					/>
					<Image
						alt="Evame"
						aria-label="Evame Logo"
						className="h-8 w-20 dark:invert hidden md:block"
						height={32}
						src="/logo.svg"
						width={80}
					/>
				</Link>
				{leftExtra}
			</div>
			<div className="flex items-center gap-4">
				{rightExtra}
				<UserMenu currentUser={currentUser} hasGeminiApiKey={false} />
			</div>
		</header>
	);
}

function SaveButton({
	hasUnsavedChanges,
	isSaving,
}: {
	hasUnsavedChanges: boolean;
	isSaving: boolean;
}) {
	return (
		<Button
			className="rounded-full hover:bg-secondary/80"
			data-testid="save-button"
			disabled={!hasUnsavedChanges && !isSaving}
			size="sm"
			type="submit"
			variant="ghost"
		>
			{isSaving ? (
				<Loader2 className={ICON_SPIN_CLASSES} />
			) : hasUnsavedChanges ? (
				<Cloud className={ICON_CLASSES} />
			) : (
				<CloudCheck className={ICON_CLASSES} data-testid="save-button-check" />
			)}
		</Button>
	);
}

export function EditHeader({
	currentUser,
	initialStatus,
	hasUnsavedChanges,
	isSaving,
	pageId,
	targetLocales,
	translationContexts,
}: EditHeaderProps) {
	const [state, action, isPending] = useActionState<
		EditPageStatusActionState,
		FormData
	>(editPageStatusAction, { success: false });
	const { handle, pageSlug } = useParams<{
		handle: string;
		pageSlug: string;
	}>();
	// Build canonical view path explicitly using params
	// For public and draft pages, link to the same page view
	const viewHref = `/${handle}/${pageSlug}`;
	//editページはiphoneSafari対応のため､baseHeaderとは別でスクロール管理が必要
	const { isVisible } = useHeaderVisibility();
	const { toastJobs } = useTranslationJobs(
		state.success ? (state.data?.translationJobs ?? []) : [],
	);
	useTranslationJobToast(toastJobs);

	const isPublic = initialStatus === "PUBLIC";

	const statusIcon = isPending ? (
		<Loader2 className={ICON_SPIN_CLASSES} />
	) : isPublic ? (
		<Globe className={ICON_CLASSES} />
	) : (
		<Lock className={ICON_CLASSES} />
	);

	const [locales, setLocales] = useState<string[]>(
		targetLocales.length > 0 ? targetLocales : ["en", "zh"],
	);
	// Determine selectable locale limit (premium users can select up to 4)
	const maxSelectableLocales =
		currentUser?.plan?.toLowerCase?.() === "premium" ? 4 : 2;
	const [clickedStatus, setClickedStatus] = useState<"PUBLIC" | "DRAFT" | null>(
		null,
	);
	const [selectedContextId, setSelectedContextId] = useState<number | null>(
		null,
	);

	const leftExtra = (
		<>
			<SaveButton hasUnsavedChanges={hasUnsavedChanges} isSaving={isSaving} />
			<input name="status" type="hidden" value={initialStatus} />
		</>
	);
	const rightExtra = (
		<div className="flex items-center gap-2">
			<EditHelpPopover />
			<Popover>
				<PopoverTrigger asChild>
					<Button
						className={BUTTON_BASE_CLASSES}
						disabled={isPending || !pageId}
						size="sm"
						variant={initialStatus === "PUBLIC" ? "default" : "secondary"}
					>
						{statusIcon}
						<span>
							{isPending
								? PROCESSING_TEXT
								: initialStatus === "PUBLIC"
									? "Public"
									: "Private"}
						</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-56 rounded-xl py-1 px-3">
					<div className="space-y-1">
						<form action={action}>
							<input name="pageId" type="hidden" value={pageId ?? ""} />
							<input name="status" type="hidden" value="PUBLIC" />
							<input
								name="targetLocales"
								type="hidden"
								value={locales.join(",")}
							/>
							<input
								name="translationContextId"
								type="hidden"
								value={selectedContextId ?? ""}
							/>
							<div className="flex justify-between items-center w-full">
								<Button
									className={MENU_BUTTON_CLASSES}
									disabled={isPending}
									onClick={() => setClickedStatus("PUBLIC")}
									type="submit"
									variant="ghost"
								>
									{isPending && clickedStatus === "PUBLIC" ? (
										<Loader2 className={ICON_SPIN_CLASSES} />
									) : initialStatus === "PUBLIC" ? (
										<>
											<LanguagesIcon className={ICON_CLASSES} />
											<span>Translate</span>
										</>
									) : (
										<>
											<Globe className={ICON_CLASSES} />
											<span>Public</span>
										</>
									)}
								</Button>
								{pageSlug && (
									<TranslationSettings
										initialContexts={translationContexts}
										locales={locales}
										maxSelectableLocales={maxSelectableLocales}
										onContextChange={setSelectedContextId}
										onLocalesChange={setLocales}
										selectedContextId={selectedContextId}
									/>
								)}
							</div>
						</form>
					</div>
					<form action={action}>
						<input name="pageId" type="hidden" value={pageId ?? ""} />
						<Button
							className={MENU_BUTTON_CLASSES}
							disabled={initialStatus === "DRAFT" || isPending}
							onClick={() => setClickedStatus("DRAFT")}
							type="submit"
							variant="ghost"
						>
							<input name="status" type="hidden" value="DRAFT" />
							{isPending && clickedStatus === "DRAFT" ? (
								<Loader2 className={ICON_SPIN_CLASSES} />
							) : (
								<>
									<Lock className={ICON_CLASSES} />
									<span>Private</span>
								</>
							)}
						</Button>
					</form>

					{!state.success && state.zodErrors?.status && (
						<p className="text-sm text-red-500">{state.zodErrors.status}</p>
					)}
					{!state.success && state.zodErrors?.pageId && (
						<p className="text-sm text-red-500">{state.zodErrors.pageId}</p>
					)}
					<Separator />
					<Button asChild className={MENU_BUTTON_CLASSES} variant="ghost">
						<Link href={viewHref as Route}>
							<LinkIcon className={ICON_CLASSES} />
							<span>{isPublic ? "View Page" : "Preview"}</span>
						</Link>
					</Button>
				</PopoverContent>
			</Popover>
		</div>
	);

	return (
		<div
			className={`sticky top-0 z-50 transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
		>
			<EditHeaderShell
				currentUser={currentUser}
				leftExtra={leftExtra}
				rightExtra={rightExtra}
			/>
		</div>
	);
}
