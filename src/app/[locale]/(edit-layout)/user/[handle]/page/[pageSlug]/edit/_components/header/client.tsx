"use client";
import type { PageStatus } from "@prisma/client";
import {
	CloudCheck,
	Globe,
	LanguagesIcon,
	LinkIcon,
	Loader2,
	Lock,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import { BaseHeader } from "@/app/[locale]/_components/header/base-header.client";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import type { SanitizedUser } from "@/app/types";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { type EditPageStatusActionState, editPageStatusAction } from "./action";
import { useHeaderVisibility } from "./hooks/use-header-visibility";
import { LocaleMultiSelector } from "./locale-multi-selector/client";

interface EditHeaderProps {
	currentUser: SanitizedUser;
	initialStatus: PageStatus;
	hasUnsavedChanges: boolean;
	pageId: number | undefined;
	targetLocales: string[];
}
const BUTTON_BASE_CLASSES =
	"flex items-center gap-2 rounded-full  transition-colors justify-start duration-200";
const MENU_BUTTON_CLASSES = `${BUTTON_BASE_CLASSES} text-sm px-3 py-2 cursor-pointer hover:bg-transparent disabled:opacity-50 disabled:pointer-events-none `;
const ICON_CLASSES = "w-4 h-4";
const ICON_SPIN_CLASSES = `${ICON_CLASSES} animate-spin`;
const PROCESSING_TEXT = "Processing...";

function SaveButton({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
	return (
		<Button
			className="rounded-full hover:bg-secondary/80"
			data-testid="save-button"
			disabled={!hasUnsavedChanges}
			size="sm"
			type="submit"
			variant="ghost"
		>
			{hasUnsavedChanges ? (
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
	pageId,
	targetLocales,
}: EditHeaderProps) {
	const [state, action, isPending] = useActionState<
		EditPageStatusActionState,
		FormData
	>(editPageStatusAction, { success: false });
	const currentPagePath = usePathname();
	const { pageSlug } = useParams<{ pageSlug?: string }>();
	const pagePath = `/${currentPagePath.split("/").slice(2, -1).join("/")}`;
	//editページはiphoneSafari対応のため､baseHeaderとは別でスクロール管理が必要
	const { isVisible } = useHeaderVisibility();
	const { toastJobs } = useTranslationJobs(
		state.success ? (state.data?.translationJobs ?? []) : [],
	);
	useTranslationJobToast(toastJobs);

	const isPublic = initialStatus === "PUBLIC";

	const statusIcon = useMemo(() => {
		if (isPending) {
			return <Loader2 className={ICON_SPIN_CLASSES} />;
		}
		return isPublic ? (
			<Globe className={ICON_CLASSES} />
		) : (
			<Lock className={ICON_CLASSES} />
		);
	}, [isPending, isPublic]);

	const [locales, setLocales] = useState<string[]>(
		targetLocales ?? ["en", "zh"],
	);
	const [clickedStatus, setClickedStatus] = useState<"PUBLIC" | "DRAFT" | null>(
		null,
	);

	const leftExtra = (
		<>
			<SaveButton hasUnsavedChanges={hasUnsavedChanges} />
			<input name="status" type="hidden" value={initialStatus} />
		</>
	);
	const rightExtra = (
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
								<LocaleMultiSelector
									className="ml-2"
									defaultValue={locales}
									onChange={setLocales}
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
					<Link href={pagePath}>
						<LinkIcon className={ICON_CLASSES} />
						<span>Preview</span>
					</Link>
				</Button>
			</PopoverContent>
		</Popover>
	);

	return (
		<>
			<div
				className={`sticky top-0 z-50  ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
			>
				<BaseHeader
					currentUser={currentUser}
					leftExtra={leftExtra}
					rightExtra={rightExtra}
					showUserMenu={true}
				/>
			</div>
		</>
	);
}
