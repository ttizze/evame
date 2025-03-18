"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { useActionState } from "react";
import type { PageCommentWithUserAndTranslations } from "../_lib/fetch-page-comments-with-user-and-translations";
import {
	type CommentDeleteActionResponse,
	commentDeleteAction,
} from "./action";

interface PageCommentItemClientProps {
	pageComment: PageCommentWithUserAndTranslations[number];
	currentHandle: string | undefined;
}

export function PageCommentItemClient({
	pageComment,
	currentHandle,
}: PageCommentItemClientProps) {
	const [state, action, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(commentDeleteAction, { success: false });

	return (
		<div className="flex items-center space-x-2">
			{currentHandle === pageComment.user.handle && (
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="h-8 w-8 p-0"
							aria-label="More options"
						>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>
							<form action={action}>
								<input
									type="hidden"
									name="pageCommentId"
									value={pageComment.id}
								/>
								<input type="hidden" name="pageId" value={pageComment.pageId} />
								<Button type="submit" variant="ghost">
									Delete
								</Button>
							</form>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
