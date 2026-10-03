import type { PageCommentWithSegments } from "./_db/queries.server";
import PageCommentItem from "./page-comment-item/server";

export function PageCommentList({
	comments,
	userLocale,
}: {
	comments: PageCommentWithSegments[];
	userLocale: string;
}) {
	return (
		<div className="space-y-4">
			{comments.map((pageComment) => (
				<PageCommentItem
					key={pageComment.id}
					pageComment={pageComment}
					userLocale={userLocale}
				/>
			))}
		</div>
	);
}
