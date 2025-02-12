import { getCurrentUser } from "@/auth";
import { fetchPageCommentsWithUserAndTranslations } from "./db/query.server";
import { PageCommentListClient } from "./page-comment-list-client";

interface CommentListProps {
	showOriginal: boolean;
	showTranslation: boolean;
	locale: string;
	pageId: number;
}

export async function PageCommentList({
	showOriginal,
	showTranslation,
	locale,
	pageId,
}: CommentListProps) {
	const currentUser = await getCurrentUser();
	const pageCommentsWithUser = await fetchPageCommentsWithUserAndTranslations(
		pageId,
		locale,
		currentUser?.id,
	);
	return (
		<PageCommentListClient
			pageCommentsWithUser={pageCommentsWithUser}
			currentHandle={currentUser?.handle}
			showOriginal={showOriginal}
			showTranslation={showTranslation}
			locale={locale}
		/>
	);
}
