import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { fetchPageCommentsWithSegments } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/_db/queries.server";
import { buildCommentTree } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/comment/_components/page-comment-list/_lib/fetch-page-comments-with-user-and-translations";
import { db } from "@/db";

export type PageCommentsData = Awaited<ReturnType<typeof loadPageComments>>;

export async function loadPageComments(
	pageId: number,
	locale: string,
	pageNumber: number,
	requestHeaders: Headers,
) {
	const page = await db
		.selectFrom("pages")
		.select(["status", "userId"])
		.where("id", "=", pageId)
		.executeTakeFirst();

	if (!page) return { comments: [], count: 0, totalPages: 0 };

	if (page.status !== "PUBLIC") {
		const currentUser = await getCurrentUserFromHeaders(requestHeaders);
		if (!currentUser || currentUser.id !== page.userId) {
			return { comments: [], count: 0, totalPages: 0 };
		}
	}

	const { comments, count, totalPages } = await fetchPageCommentsWithSegments(
		pageId,
		locale,
		pageNumber,
	);
	return {
		comments: buildCommentTree(comments),
		count,
		totalPages,
	};
}
