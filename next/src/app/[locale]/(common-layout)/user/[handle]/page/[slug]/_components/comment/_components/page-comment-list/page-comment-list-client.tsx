"use client";
import { CommentItem } from "./comment-item.client";
import type { PageCommentWithUserAndTranslations } from "./lib/fetch-page-comments-with-user-and-translations";

interface CommentListClientProps {
	pageCommentsWithUserAndTranslations: PageCommentWithUserAndTranslations;
	currentHandle: string | undefined;
}

export function PageCommentListClient({
	pageCommentsWithUserAndTranslations,
	currentHandle,
}: CommentListClientProps) {
	return (
		<div className="space-y-4">
			{pageCommentsWithUserAndTranslations.map((pageComment) => {
				return (
					<CommentItem
						key={pageComment.id}
						pageComment={pageComment}
						currentHandle={currentHandle}
					/>
				);
			})}
		</div>
	);
}
