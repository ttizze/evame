import { auth } from "@/auth";
import { fetchPageCommentsWithUserAndTranslations } from "./db/query.server";
import { PageCommentListClient } from "./page-comment-list-client";

interface CommentListProps {
	currentHandle: string | undefined;
	showOriginal: boolean;
	showTranslation: boolean;
	locale: string;
	pageId: number;
}

export async function PageCommentList({
	currentHandle,
	showOriginal,
	showTranslation,
	locale,
	pageId,
}: CommentListProps) {
	const session = await auth();
	const currentUserId = session?.user?.id;
	const pageCommentsWithUser = await fetchPageCommentsWithUserAndTranslations(
		pageId,
		locale,
		currentUserId,
	);
	return (
		<PageCommentListClient
			pageCommentsWithUser={pageCommentsWithUser}
			currentHandle={currentHandle}
			showOriginal={showOriginal}
			showTranslation={showTranslation}
			locale={locale}
		/>
	);
}
