import { getCurrentUser } from "@/auth";
import { fetchPageCommentsWithUserAndTranslations } from "./lib/fetch-page-comments-with-user-and-translations";
import { PageCommentListClient } from "./page-comment-list-client";

interface CommentListProps {
	locale: string;
	pageId: number;
}

export async function PageCommentList({ locale, pageId }: CommentListProps) {
	const currentUser = await getCurrentUser();
	const pageCommentsWithUserAndTranslations =
		await fetchPageCommentsWithUserAndTranslations(
			pageId,
			locale,
			currentUser?.id,
		);
	return (
		<PageCommentListClient
			pageCommentsWithUserAndTranslations={pageCommentsWithUserAndTranslations}
			currentHandle={currentUser?.handle}
		/>
	);
}
