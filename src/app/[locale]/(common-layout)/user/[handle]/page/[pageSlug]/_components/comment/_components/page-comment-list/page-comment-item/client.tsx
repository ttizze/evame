"use client";

import { CommentActionMenu } from "@/app/[locale]/_components/comment/comment-action-menu.client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useActionState } from "react";
import type { PageCommentWithUserAndTranslations } from "../_lib/fetch-page-comments-with-user-and-translations";
import {
	type CommentDeleteActionResponse,
	deletePageCommentAction,
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
	>(deletePageCommentAction, { success: false });

	if (currentHandle !== pageComment.user.handle) return null;

	return (
		<CommentActionMenu>
			<DropdownMenuItem asChild>
				<form action={action} className="w-full">
					<input type="hidden" name="pageCommentId" value={pageComment.id} />
					<input type="hidden" name="pageId" value={pageComment.pageId} />
					<Button type="submit" variant="ghost" disabled={isPending}>
						Delete
					</Button>
				</form>
			</DropdownMenuItem>
		</CommentActionMenu>
	);
}
