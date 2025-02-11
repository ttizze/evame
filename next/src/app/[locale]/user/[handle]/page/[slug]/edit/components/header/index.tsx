"use client";
import { BaseHeaderLayout } from "@/app/[locale]/components/base-header-layout";
import type { SanitizedUser } from "@/app/types";
import { NavigationLink } from "@/components/navigation-link";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { PageStatus } from "@prisma/client";
import { Check, Globe, LinkIcon, Loader2, Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { type EditPageStatusActionState, editPageStatusAction } from "./action";

interface EditHeaderProps {
	currentUser: SanitizedUser;
	initialStatus: PageStatus;
	hasUnsavedChanges: boolean;
	pageId: number | undefined;
}

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

	const renderButtonIcon = () => {
		if (hasUnsavedChanges) {
			return <Loader2 className="w-4 h-4 animate-spin" />;
		}
		return <Check className="w-4 h-4" data-testid="save-button-check" />;
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
					className="rounded-full flex items-center gap-2 px-4 py-2 transition-colors duration-400"
					disabled={isPending}
				>
					{initialStatus === "PUBLIC" ? (
						<Globe className="w-4 h-4" />
					) : (
						<Lock className="w-4 h-4" />
					)}
					<span>{initialStatus === "PUBLIC" ? "Public" : "Private"}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-32 rounded-xl p-1" align="end">
				<div className="space-y-1 p-1">
					<form action={action}>
						<input
							type="hidden"
							name="status"
							value={initialStatus === "PUBLIC" ? "DRAFT" : "PUBLIC"}
						/>
						<input type="hidden" name="pageId" value={pageId} />
						<button
							type="submit"
							className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
							disabled={initialStatus === "PUBLIC"}
						>
							<Globe className="w-4 h-4" />
							<span>Public</span>
						</button>

						<button
							type="submit"
							className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
							disabled={initialStatus === "DRAFT"}
						>
							<Lock className="w-4 h-4" />
							<span>Private</span>
						</button>
					</form>
					{state.zodErrors?.status && (
						<p className="text-sm text-red-500">{state.zodErrors.status}</p>
					)}
					{pageId && (
						<>
							<Separator />
							<NavigationLink
								href={pagePath}
								className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
							>
								<LinkIcon className="w-4 h-4" />
								<span>Preview</span>
							</NavigationLink>
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);

	return (
		<BaseHeaderLayout
			currentUser={currentUser}
			leftExtra={leftExtra}
			rightExtra={rightExtra}
			showUserMenu={true}
		/>
	);
}
