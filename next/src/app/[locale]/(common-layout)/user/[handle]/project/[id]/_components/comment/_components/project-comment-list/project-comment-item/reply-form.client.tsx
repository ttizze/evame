"use client";

import { useState } from "react";
import { ProjectCommentForm } from "../../project-comment-form/client";

export function ReplyForm({
	projectId,
	userLocale,
	currentHandle,
	parentId,
}: {
	projectId: string;
	userLocale: string;
	currentHandle: string | undefined;
	parentId: number;
}) {
	const [isReplying, setIsReplying] = useState(false);

	if (!isReplying) {
		return (
			<button
				type="button"
				onClick={() => setIsReplying(true)}
				className="text-sm text-muted-foreground hover:text-foreground mt-2"
			>
				Reply
			</button>
		);
	}

	return (
		<div className="mt-2">
			<h4 className="text-sm font-semibold mb-2">Your Reply</h4>
			<ProjectCommentForm
				projectId={projectId}
				userLocale={userLocale}
				currentHandle={currentHandle}
				parentId={parentId}
				onReplySuccess={() => setIsReplying(false)}
			/>
			<button
				type="button"
				onClick={() => setIsReplying(false)}
				className="text-sm text-muted-foreground hover:text-foreground mt-2"
			>
				Cancel
			</button>
		</div>
	);
}
