import { getCurrentUser } from "@/auth";
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
	const currentUser = await getCurrentUser();
	const pageCommentsWithUserAndTranslations =
		await fetchPageCommentsWithUserAndTranslations(
			pageId,
			userLocale,
			currentUser?.id,
		);
	return (
		<div className="space-y-4">
			{pageCommentsWithUserAndTranslations.map((pageComment) => {
				return (
					<PageCommentItem
						key={pageComment.id}
						pageComment={pageComment}
						currentHandle={currentUser?.handle}
						userLocale={userLocale}
					/>
				);
			})}
		</div>
	);
}
