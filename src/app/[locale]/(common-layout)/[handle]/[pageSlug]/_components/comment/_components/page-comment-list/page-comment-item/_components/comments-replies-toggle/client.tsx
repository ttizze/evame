"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageCommentForm } from "../../../../page-comment-form/client";

interface CommentReplyProps {
	commentId: number;
	pageId: number;
	userLocale: string;
}

// Simple reply action: toggle reply form only (no expand/collapse UI)
export function CommentRepliesToggle({
	commentId,
	pageId,
	userLocale,
}: CommentReplyProps) {
	const [isReplying, setIsReplying] = useState(false);

	return (
		<div className="mt-2">
			<div className="flex items-center gap-2">
				<Button
					className="h-7 px-2"
					onClick={() => setIsReplying((v) => !v)}
					size="sm"
					variant="ghost"
				>
					<MessageCirclePlus className="w-4 h-4 mr-1" />
					<span className="text-xs">Reply</span>
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
