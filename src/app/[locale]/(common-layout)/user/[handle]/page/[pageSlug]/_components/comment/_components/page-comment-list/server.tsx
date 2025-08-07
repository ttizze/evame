import { fetchPageCommentsWithUserAndTranslations } from "./_lib/fetch-page-comments-with-user-and-translations";
import PageCommentItem from "./page-comment-item/server";

interface CommentListProps {
	userLocale: string;
	pageId: number;
}

export async function PageCommentList({
	userLocale,
	pageId,
}: CommentListProps) {
	const pageCommentsWithUserAndTranslations =
		await fetchPageCommentsWithUserAndTranslations(pageId, userLocale);
	return (
		<div className="space-y-4">
			{pageCommentsWithUserAndTranslations.map((pageComment) => {
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
