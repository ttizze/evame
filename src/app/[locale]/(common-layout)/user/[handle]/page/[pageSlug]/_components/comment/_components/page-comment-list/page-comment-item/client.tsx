"use client";

import { useActionState } from "react";
import { CommentActionMenu } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-form/comment/comment-action-menu.client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import type { PageCommentWithUserAndTranslations } from "../_lib/fetch-page-comments-with-user-and-translations";
import {
	type CommentDeleteActionResponse,
	deletePageCommentAction,
} from "./action";

interface PageCommentItemClientProps {
	pageComment: PageCommentWithUserAndTranslations[number];
}

export function PageCommentItemClient({
	pageComment,
}: PageCommentItemClientProps) {
	const [_state, action, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(deletePageCommentAction, { success: false });
	const { data: session } = authClient.useSession();

	if (session?.user.handle !== pageComment.user.handle) return null;

	return (
		<CommentActionMenu>
			<DropdownMenuItem asChild>
				<form action={action} className="w-full">
					<input name="pageCommentId" type="hidden" value={pageComment.id} />
					<input name="pageId" type="hidden" value={pageComment.pageId} />
					<Button disabled={isPending} type="submit" variant="ghost">
						Delete
					</Button>
				</form>
			</DropdownMenuItem>
		</CommentActionMenu>
	);
}
