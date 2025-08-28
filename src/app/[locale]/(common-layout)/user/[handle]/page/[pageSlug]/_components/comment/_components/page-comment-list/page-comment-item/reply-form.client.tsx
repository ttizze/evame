"use client";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageCommentForm } from "../../page-comment-form/client";
export function PageCommentReplyForm({
	pageId,
	parentId,
	userLocale,
}: {
	pageId: number;
	parentId: number;
	userLocale: string;
}) {
	const [isReplying, setIsReplying] = useState(false);
	return (
		<div>
			<Button
				aria-label="Reply"
				className="h-7 px-2"
				onClick={() => setIsReplying(!isReplying)}
				variant="ghost"
			>
				<MessageSquarePlus className="w-4 h-4 mr-1" />
				<span className="text-xs">Reply</span>
			</Button>
			{isReplying && (
				<div className="mt-2">
					<PageCommentForm
						onReplySuccess={() => setIsReplying(false)}
						pageId={pageId}
						parentId={parentId}
						userLocale={userLocale}
					/>
				</div>
			)}
		</div>
	);
}
