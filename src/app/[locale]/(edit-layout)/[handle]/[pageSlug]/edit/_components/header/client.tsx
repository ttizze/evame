"use client";

import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	CloudCheck,
	Globe,
	LanguagesIcon,
	LinkIcon,
	Loader2,
	Lock,
} from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
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
import { type EditPageStatusActionState, editPageStatus } from "./action";
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
	pageSlug: string;
	handle: string;
	locale: string;
	targetLocales: string[];
	translationContexts: TranslationContext[];
}

const BUTTON_BASE_CLASSES =
	"flex items-center gap-2 rounded-full transition-colors justify-start duration-200";
const MENU_BUTTON_CLASSES = `${BUTTON_BASE_CLASSES} text-sm px-3 py-2 cursor-pointer hover:bg-transparent disabled:opacity-50 disabled:pointer-events-none`;
const ICON_CLASSES = "w-4 h-4";
const ICON_SPIN_CLASSES = `${ICON_CLASSES} animate-spin`;
const PROCESSING_TEXT = "Processing...";

interface EditHeaderShellProps {
	currentUser: SanitizedUser;
	locale: string;
	leftExtra?: ReactNode;
	rightExtra?: ReactNode;
}

function EditHeaderShell({
	currentUser,
	locale,
	leftExtra,
	rightExtra,
}: EditHeaderShellProps) {
	return (
		<header className="z-50 bg-background rounded-b-3xl max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center">
			<div className="flex items-center gap-4">
				<Link className="flex items-center" params={{ locale }} to="/$locale">
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
				{leftExtra}
			</div>
			<div className="flex items-center gap-4">
				{rightExtra}
				<UserMenu
					currentUser={currentUser}
					hasGeminiApiKey={false}
					locale={locale}
				/>
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
	hasUnsavedChanges,
	isSaving,
	pageId,
	pageSlug,
	handle,
	locale,
	targetLocales,
	translationContexts,
}: EditHeaderProps) {
	const [status, setStatus] = useState<PageStatus>(initialStatus);
	const [state, setState] = useState<EditPageStatusActionState>({
		success: false,
	});
	const [isPending, startTransition] = useTransition();
	const editPageStatusFn = useServerFn(editPageStatus);
	const [locales, setLocales] = useState<string[]>(
		targetLocales.length > 0 ? targetLocales : ["en", "zh"],
	);
	const [clickedStatus, setClickedStatus] = useState<PageStatus | null>(null);
	const [selectedContextId, setSelectedContextId] = useState<number | null>(
		null,
	);
	const { isVisible } = useHeaderVisibility();
	const { toastJobs } = useTranslationJobs(
		state.success ? (state.data?.translationJobs ?? []) : [],
	);
	useTranslationJobToast(toastJobs);

	const maxSelectableLocales =
		currentUser.plan?.toLowerCase?.() === "premium" ? 4 : 2;
	const isPublic = status === "PUBLIC";
	const isProcessing = isPending || isSaving;

	const submitStatus = (nextStatus: PageStatus) => {
		if (!pageId || isProcessing) return;
		setClickedStatus(nextStatus);
		const formData = new FormData();
		formData.set("pageId", String(pageId));
		formData.set("status", nextStatus);
		formData.set("targetLocales", locales.join(","));
		if (selectedContextId !== null) {
			formData.set("translationContextId", String(selectedContextId));
		}
		startTransition(async () => {
			const result = await editPageStatusFn({ data: formData });
			setState(result);
			if (result.success) setStatus(nextStatus);
		});
	};

	const statusIcon = isProcessing ? (
		<Loader2 className={ICON_SPIN_CLASSES} />
	) : isPublic ? (
		<Globe className={ICON_CLASSES} />
	) : (
		<Lock className={ICON_CLASSES} />
	);

	const leftExtra = (
		<SaveButton hasUnsavedChanges={hasUnsavedChanges} isSaving={isSaving} />
	);
	const rightExtra = (
		<div className="flex items-center gap-2">
			<EditHelpPopover />
			<Popover>
				<PopoverTrigger asChild>
					<Button
						className={BUTTON_BASE_CLASSES}
						disabled={isProcessing || !pageId}
						size="sm"
						variant={isPublic ? "default" : "secondary"}
					>
						{statusIcon}
						<span>
							{isProcessing ? PROCESSING_TEXT : isPublic ? "Public" : "Private"}
						</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-56 rounded-xl py-1 px-3">
					<div className="space-y-1">
						<div className="flex justify-between items-center w-full">
							<Button
								className={MENU_BUTTON_CLASSES}
								disabled={isProcessing}
								onClick={() => submitStatus("PUBLIC")}
								type="button"
								variant="ghost"
							>
								{isProcessing && clickedStatus === "PUBLIC" ? (
									<Loader2 className={ICON_SPIN_CLASSES} />
								) : isPublic ? (
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
						<Button
							className={MENU_BUTTON_CLASSES}
							disabled={status === "DRAFT" || isProcessing}
							onClick={() => submitStatus("DRAFT")}
							type="button"
							variant="ghost"
						>
							{isProcessing && clickedStatus === "DRAFT" ? (
								<Loader2 className={ICON_SPIN_CLASSES} />
							) : (
								<>
									<Lock className={ICON_CLASSES} />
									<span>Private</span>
								</>
							)}
						</Button>
						{!state.success && state.zodErrors?.status && (
							<p className="text-sm text-red-500">
								{state.zodErrors.status.join(", ")}
							</p>
						)}
						{!state.success && state.zodErrors?.pageId && (
							<p className="text-sm text-red-500">
								{state.zodErrors.pageId.join(", ")}
							</p>
						)}
						<Separator />
						<Button asChild className={MENU_BUTTON_CLASSES} variant="ghost">
							<Link
								params={{ handle, locale, pageSlug }}
								to="/$locale/$handle/$pageSlug"
							>
								<LinkIcon className={ICON_CLASSES} />
								<span>{isPublic ? "View Page" : "Preview"}</span>
							</Link>
						</Button>
					</div>
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
				locale={locale}
				rightExtra={rightExtra}
			/>
		</div>
	);
}
