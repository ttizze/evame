"use client";
import { BaseHeaderLayout } from "@/app/[locale]/_components/header/base-header-layout";
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
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { type EditPageStatusActionState, editPageStatusAction } from "./action";
interface EditHeaderProps {
	currentUser: SanitizedUser;
	initialStatus: PageStatus;
	hasUnsavedChanges: boolean;
	pageId: number | undefined;
}
const BUTTON_BASE_CLASSES =
	"flex items-center gap-2 rounded-full  transition-colors duration-200";
const MENU_BUTTON_CLASSES = `${BUTTON_BASE_CLASSES} text-sm px-3 py-2 disabled:opacity-50 disabled:pointer-events-none `;
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
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		if (state.success) {
			toast.success(state.message);
		}
	}, [state.success, state.message]);

	useEffect(() => {
		const container = document.getElementById("root");
		if (!container) return;

		const handleScroll = () => {
			const currentScrollY = container.scrollTop;

			if (currentScrollY < 10) {
				setIsVisible(true);
			} else if (currentScrollY < lastScrollY) {
				// スクロールアップ
				setIsVisible(true);
			} else if (currentScrollY > lastScrollY) {
				// スクロールダウン
				setIsVisible(false);
			}

			setLastScrollY(currentScrollY);
		};

		container.addEventListener("scroll", handleScroll, { passive: true });
		return () => container.removeEventListener("scroll", handleScroll);
	}, [lastScrollY]);
	const renderButtonIcon = () => {
		if (hasUnsavedChanges) {
			return <Loader2 className={`${ICON_CLASSES} animate-spin`} />;
		}
		return <Check className={ICON_CLASSES} data-testid="save-button-check" />;
	};
	const renderStatusIcon = () => {
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
					<span>{initialStatus === "PUBLIC" ? "Public" : "Private"}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-38 rounded-xl py-1 px-3" align="end">
				<div className="space-y-1">
					<form action={action}>
						<input type="hidden" name="pageId" value={pageId ?? ""} />
						<input type="hidden" name="status" value="PUBLIC" />
						<div className="flex justify-between items-center w-full">
							<button type="submit" className={MENU_BUTTON_CLASSES}>
								{initialStatus === "PUBLIC" ? (
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
							</button>
							<Popover>
								<PopoverTrigger asChild>
									<button
										type="button"
										className="ml-3 text-muted-foreground hover:text-foreground flex items-center"
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
					<button
						type="submit"
						className={MENU_BUTTON_CLASSES}
						disabled={initialStatus === "DRAFT"}
					>
						<input type="hidden" name="status" value="DRAFT" />
						<Lock className={ICON_CLASSES} />
						<span>Private</span>
					</button>
				</form>

				{state.zodErrors?.status && (
					<p className="text-sm text-red-500">{state.zodErrors.status}</p>
				)}
				{state.zodErrors?.pageId && (
					<p className="text-sm text-red-500">{state.zodErrors.pageId}</p>
				)}
				<Separator />
				<Link href={pagePath} className={MENU_BUTTON_CLASSES}>
					<LinkIcon className={ICON_CLASSES} />
					<span>Preview</span>
				</Link>
			</PopoverContent>
		</Popover>
	);

	return (
		<div
			className={`sticky top-0 z-50  ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
		>
			<BaseHeaderLayout
				currentUser={currentUser}
				leftExtra={leftExtra}
				rightExtra={rightExtra}
				showUserMenu={true}
			/>
		</div>
	);
}
