"use client";
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
import type { PageStatus } from "@prisma/client";
import {
	Check,
	Globe,
	InfoIcon,
	LanguagesIcon,
	LinkIcon,
	Loader2,
	Lock,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { type EditPageStatusActionState, editPageStatusAction } from "./action";
import { useHeaderVisibility } from "./hooks/use-header-visibility";
interface EditHeaderProps {
	currentUser: SanitizedUser;
	initialStatus: PageStatus;
	hasUnsavedChanges: boolean;
	pageId: number | undefined;
}
const BUTTON_BASE_CLASSES =
	"flex items-center gap-2 rounded-full  transition-colors justify-start duration-200";
const MENU_BUTTON_CLASSES = `${BUTTON_BASE_CLASSES} text-sm px-3 py-2 cursor-pointer hover:bg-transparent disabled:opacity-50 disabled:pointer-events-none `;
const ICON_CLASSES = "w-4 h-4";

export function EditHeader({
	currentUser,
	initialStatus,
	hasUnsavedChanges,
	pageId,
}: EditHeaderProps) {
	const [state, action, isPending] = useActionState<
		EditPageStatusActionState,
		FormData
	>(editPageStatusAction, { success: false });
	const currentPagePath = usePathname();
	const pagePath = `/${currentPagePath.split("/").slice(2, -1).join("/")}`;
	//editページはiphoneSafari対応のため､baseHeaderとは別でスクロール管理が必要
	const { isVisible } = useHeaderVisibility();
	const { jobs } = useTranslationJobs(
		state.success ? (state.data?.translationJobs ?? []) : [],
	);

	useTranslationJobToast(jobs);

	const renderButtonIcon = () => {
		if (hasUnsavedChanges) {
			return <Loader2 className={`${ICON_CLASSES} animate-spin`} />;
		}
		return <Check className={ICON_CLASSES} data-testid="save-button-check" />;
	};
	const renderStatusIcon = () => {
		if (isPending) {
			return <Loader2 className={`${ICON_CLASSES} animate-spin`} />;
		}
		return initialStatus === "PUBLIC" ? (
			<Globe className={ICON_CLASSES} />
		) : (
			<Lock className={ICON_CLASSES} />
		);
	};
	const leftExtra = (
		<>
			<Button
				type="submit"
				variant="ghost"
				size="sm"
				className="rounded-full hover:bg-secondary/80"
				disabled={!hasUnsavedChanges}
				data-testid="save-button"
			>
				{renderButtonIcon()}
			</Button>
			<input type="hidden" name="status" value={initialStatus} />
		</>
	);
	const rightExtra = (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={initialStatus === "PUBLIC" ? "default" : "secondary"}
					size="sm"
					className={BUTTON_BASE_CLASSES}
					disabled={isPending || !pageId}
				>
					{renderStatusIcon()}
					<span>
						{isPending
							? "Processing..."
							: initialStatus === "PUBLIC"
								? "Public"
								: "Private"
						}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-46 rounded-xl py-1 px-3" align="end">
				<div className="space-y-1">
					<form action={action}>
						<input type="hidden" name="pageId" value={pageId ?? ""} />
						<input type="hidden" name="status" value="PUBLIC" />
						<div className="flex justify-between items-center w-full">
							<Button
								type="submit"
								variant="ghost"
								className={MENU_BUTTON_CLASSES}
								disabled={isPending}
							>
								{isPending ? (
									<>
										<Loader2 className={`${ICON_CLASSES} animate-spin`} />
										<span>Processing...</span>
									</>
								) : initialStatus === "PUBLIC" ? (
									<>
										<LanguagesIcon className={ICON_CLASSES} />
										<span>Translate</span>
									</>
								) : (
									<>
										<Globe className={ICON_CLASSES} />
										<span>Public</span>
										<div className="flex items-center bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
											<LanguagesIcon className="w-3 h-3" />
										</div>
									</>
								)}
							</Button>
							<Popover>
								<PopoverTrigger asChild>
									<button
										type="button"
										className="ml-3 text-muted-foreground cursor-pointer hover:text-foreground flex items-center"
									>
										<InfoIcon className={ICON_CLASSES} />
									</button>
								</PopoverTrigger>
								<PopoverContent
									className="w-60 p-3 rounded-xl space-y-3"
									side="right"
								>
									<div className="flex items-center justify-center gap-2">
										<LanguagesIcon className="h-4 w-4 text-primary" />
										<h4 className="font-medium text-sm">Auto-Translation</h4>
									</div>

									<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
										<span>Translates to:</span>
									</div>

									<div className="bg-secondary/80 rounded-lg p-2">
										<div className="grid grid-cols-4 gap-2 text-center">
											<div className="text-xs font-medium">EN</div>
											<div className="text-xs font-medium">JP</div>
											<div className="text-xs font-medium">CN</div>
											<div className="text-xs font-medium">KR</div>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>
					</form>
				</div>
				<form action={action}>
					<input type="hidden" name="pageId" value={pageId ?? ""} />
					<Button
						type="submit"
						variant="ghost"
						className={MENU_BUTTON_CLASSES}
						disabled={initialStatus === "DRAFT" || isPending}
					>
						<input type="hidden" name="status" value="DRAFT" />
						{isPending ? (
							<>
								<Loader2 className={`${ICON_CLASSES} animate-spin`} />
								<span>Processing...</span>
							</>
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
				<Button variant="ghost" className={MENU_BUTTON_CLASSES} asChild>
					<Link href={pagePath}>
						<LinkIcon className={ICON_CLASSES} />
						<span>Preview</span>
					</Link>
				</Button>
			</PopoverContent>
		</Popover>
	);

	return (
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
	);
}
