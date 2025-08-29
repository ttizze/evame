import { unstable_noStore as noStore } from "next/cache";
import { listRootPageComments } from "./_db/queries.server";
import PageCommentItem from "./page-comment-item/server";

interface CommentListProps {
	userLocale: string;
	pageId: number;
	expandedIds: number[];
}

export async function PageCommentList({
	userLocale,
	pageId,
	expandedIds,
}: CommentListProps) {
	noStore();
	const roots = await listRootPageComments(pageId, userLocale);
	return (
		<div className="space-y-4">
			{roots.map((pageComment) => {
				return (
					<PageCommentItem
						expandedIds={expandedIds}
						key={pageComment.id}
						pageComment={pageComment}
						userLocale={userLocale}
					/>
				);
			})}
		</div>
	);
}
