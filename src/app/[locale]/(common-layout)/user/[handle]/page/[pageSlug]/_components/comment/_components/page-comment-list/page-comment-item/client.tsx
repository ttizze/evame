"use client";

import { useActionState } from "react";
import { CommentActionMenu } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_components/comment/_components/page-comment-form/comment/comment-action-menu.client";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";
import {
	type CommentDeleteActionResponse,
	deletePageCommentAction,
} from "./action";

interface PageCommentItemClientProps {
	pageCommentId: number;
	pageId: number;
	user: { handle: string };
}

export function PageCommentItemClient({
	pageCommentId,
	pageId,
	user,
}: PageCommentItemClientProps) {
	const hydrated = useHydrated();
	const [_state, action, isPending] = useActionState<
		CommentDeleteActionResponse,
		FormData
	>(deletePageCommentAction, { success: false });
	const { data: session } = authClient.useSession();

	if (!hydrated || session?.user.handle !== user.handle) return null;

	return (
		<CommentActionMenu>
			<DropdownMenuItem asChild>
				<form action={action} className="w-full">
					<input name="pageCommentId" type="hidden" value={pageCommentId} />
					<input name="pageId" type="hidden" value={pageId} />
					<Button disabled={isPending} type="submit" variant="ghost">
						Delete
					</Button>
				</form>
			</DropdownMenuItem>
		</CommentActionMenu>
	);
}
