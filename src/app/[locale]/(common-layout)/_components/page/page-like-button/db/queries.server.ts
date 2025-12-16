import { sql } from "kysely";
import { db } from "@/db";

/**
 * ページのいいね数と現在のユーザーがいいねしているかチェック
 * Kyselyに移行済み
 */
export async function getPageLikeAndCount(
	pageId: number,
	currentUserId: string,
) {
	// Get like count and check if current user has liked in a single query
	const [likeCountResult, userLikeResult] = await Promise.all([
		db
			.selectFrom("likePages")
			.select(sql<number>`count(*)::int`.as("count"))
			.where("pageId", "=", pageId)
			.executeTakeFirst(),
		currentUserId
			? db
					.selectFrom("likePages")
					.selectAll()
					.where("pageId", "=", pageId)
					.where("userId", "=", currentUserId)
					.executeTakeFirst()
			: Promise.resolve(undefined),
	]);

	return {
		likeCount: Number(likeCountResult?.count ?? 0),
		liked: !!userLikeResult,
	};
}
