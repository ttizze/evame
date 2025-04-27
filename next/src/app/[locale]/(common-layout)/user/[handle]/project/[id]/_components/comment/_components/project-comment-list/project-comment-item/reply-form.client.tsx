"use client";
import { Button } from "@/components/ui/button";
import { Reply } from "lucide-react";
import { useState } from "react";
import { ProjectCommentForm } from "../../project-comment-form/client";

export function ProjectCommentReplyForm({
	projectId,
	currentHandle,
	parentId,
	userLocale,
}: {
	projectId: string;
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
				<ProjectCommentForm
					projectId={projectId}
					currentHandle={currentHandle}
					parentId={parentId}
					userLocale={userLocale}
					onReplySuccess={() => setIsReplying(false)}
				/>
			)}
		</>
	);
}
