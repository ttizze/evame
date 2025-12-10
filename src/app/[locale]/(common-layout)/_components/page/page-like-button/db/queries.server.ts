import { and, count, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { likePages } from "@/drizzle/schema";

/**
 * ページのいいね数と現在のユーザーがいいねしているかチェック
 * Drizzleに移行済み
 */
export async function getPageLikeAndCount(
	pageId: number,
	currentUserId: string,
) {
	// Get like count and check if current user has liked in a single query
	const [likeCountResult, userLikeResult] = await Promise.all([
		db
			.select({ count: count() })
			.from(likePages)
			.where(eq(likePages.pageId, pageId)),
		currentUserId
			? db
					.select()
					.from(likePages)
					.where(
						and(
							eq(likePages.pageId, pageId),
							eq(likePages.userId, currentUserId),
						),
					)
					.limit(1)
			: Promise.resolve([]),
	]);

	return {
		likeCount: Number(likeCountResult[0]?.count ?? 0),
		liked: !!userLikeResult[0],
	};
}
