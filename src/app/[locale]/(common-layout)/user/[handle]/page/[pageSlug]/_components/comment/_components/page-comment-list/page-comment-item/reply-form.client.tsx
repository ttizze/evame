"use client";
import { Reply } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageCommentForm } from "../../page-comment-form/client";

export function PageCommentReplyForm({
	pageId,
	currentHandle,
	parentId,
	userLocale,
}: {
	pageId: number;
	currentHandle: string | undefined;
	parentId: number;
	userLocale: string;
}) {
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
					userLocale={userLocale}
					onReplySuccess={() => setIsReplying(false)}
				/>
			)}
		</>
	);
}
