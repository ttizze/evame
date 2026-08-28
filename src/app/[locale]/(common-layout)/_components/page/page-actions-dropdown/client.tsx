"use client";

import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MoreVertical } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageStatus } from "@/db/types";
import { DeletePageDialog } from "../delete-page-dialog/delete-page-dialog";
import { type TogglePublishState, togglePublishAction } from "./action";

interface PageActionsDropdownProps {
	pageId: number;
	status: PageStatus;
	locale: string;
	handle: string;
	pageSlug: string;
	className?: string;
}

export function PageActionsDropdown({
	pageId,
	status,
	locale,
	handle,
	pageSlug,
	className = "",
}: PageActionsDropdownProps) {
	const router = useRouter();
	const togglePublishFn = useServerFn(togglePublishAction);
	const [publishState, publishAction, isPublishing] = useActionState<
		TogglePublishState,
		FormData
	>(
		async (_previousState, formData) => {
			try {
				return await togglePublishFn({
					data: {
						locale,
						pageId: Number(formData.get("pageId")),
					},
				});
			} catch (error) {
				return {
					success: false,
					message:
						error instanceof Error
							? error.message
							: "Failed to update page status",
				};
			}
		},
		{ success: false },
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	useEffect(() => {
		if (publishState.success) {
			toast.success(publishState.message);
			void router.invalidate({ sync: true });
			return;
		}
		if (publishState.message) {
			toast.error(publishState.message);
		}
	}, [publishState, router]);

	return (
		<>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label="More options"
						className={`h-8 w-6 cursor-pointer p-0 ${className}`}
						variant="ghost"
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem asChild className="w-full cursor-pointer text-left">
						<Link
							className="w-full text-left"
							params={{ handle, locale, pageSlug }}
							to="/$locale/$handle/$pageSlug/edit"
						>
							Edit
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem className="w-full cursor-pointer text-left">
						<form action={publishAction}>
							<input name="pageId" type="hidden" value={pageId} />
							<button
								className="w-full text-left"
								disabled={isPublishing}
								type="submit"
							>
								{status === "PUBLIC" ? "Make Private" : "Make Public"}
							</button>
						</form>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<button
							className="w-full cursor-pointer text-left text-red-500"
							onClick={() => setDeleteDialogOpen(true)}
							type="button"
						>
							Delete
						</button>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<DeletePageDialog
				locale={locale}
				onOpenChange={setDeleteDialogOpen}
				open={deleteDialogOpen}
				pageId={pageId}
			/>
		</>
	);
}
