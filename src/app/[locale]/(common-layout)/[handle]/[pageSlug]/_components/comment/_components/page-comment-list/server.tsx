import { listRootPageComments } from "./_db/queries.server";
import PageCommentItem from "./page-comment-item/server";

interface CommentListProps {
	userLocale: string;
	pageId: number;
}

export async function PageCommentList({
	userLocale,
	pageId,
}: CommentListProps) {
	const roots = await listRootPageComments(pageId, userLocale);
	return (
		<div className="space-y-4">
			{roots.map((pageComment) => {
				return (
					<PageCommentItem
						key={pageComment.id}
						pageComment={pageComment}
						userLocale={userLocale}
					/>
				);
			})}
		</div>
	);
}
