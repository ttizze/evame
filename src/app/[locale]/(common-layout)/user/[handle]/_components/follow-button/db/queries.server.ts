import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { follows } from "@/drizzle/schema";

/**
 * フォロー関係をチェック
 * Drizzleに移行済み
 */
export async function isFollowing(followerId: string, followingId: string) {
	// フォロー関係を直接チェック（ユーザーの存在チェックは外部キー制約で保証される）
	const follow = await db
		.select()
		.from(follows)
		.where(
			and(
				eq(follows.followerId, followerId),
				eq(follows.followingId, followingId),
			),
		)
		.limit(1);

	return !!follow[0];
}
