"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageCommentForm } from "../../../../page-comment-form/client";

export function CommentRepliesToggle({
	commentId,
	pageId,
	replyCount,
	userLocale,
}: {
	commentId: number;
	pageId: number;
	replyCount: number;
	userLocale: string;
}) {
	const [isReplying, setIsReplying] = useState(false);

	return (
		<div className="mt-2">
			<div className="flex items-center gap-2">
				<Button
					className="h-7 px-2"
					onClick={() => setIsReplying((value) => !value)}
					size="sm"
					type="button"
					variant="ghost"
				>
					<MessageCirclePlus className="mr-1 h-4 w-4" />
					<span className="text-xs">
						Reply{replyCount > 0 ? ` (${replyCount})` : ""}
					</span>
				</Button>
			</div>

			{isReplying && (
				<div className="mt-2">
					<PageCommentForm
						onReplySuccess={() => setIsReplying(false)}
						pageId={pageId}
						parentId={commentId}
						userLocale={userLocale}
					/>
				</div>
			)}
		</div>
	);
}
