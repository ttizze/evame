"use client";
import { Button } from "@/components/ui/button";
import { Reply } from "lucide-react";
import { useState } from "react";
import { PageCommentForm } from "../../page-comment-form";

export function ReplyForm({
	pageId,
	currentHandle,
	parentId,
}: { pageId: number; currentHandle: string | undefined; parentId: number }) {
	const [isReplying, setIsReplying] = useState(false);
	return (
		<>
			<Button
				variant="ghost"
				className="h-8 w-8 p-0"
				onClick={() => setIsReplying(!isReplying)}
				disabled={!currentHandle}
				aria-label="Reply"
			>
				<Reply className="h-4 w-4" />
			</Button>
			{isReplying && (
				<PageCommentForm
					pageId={pageId}
					currentHandle={currentHandle}
					parentId={parentId}
					onReplySuccess={() => setIsReplying(false)}
				/>
			)}
		</>
	);
}
