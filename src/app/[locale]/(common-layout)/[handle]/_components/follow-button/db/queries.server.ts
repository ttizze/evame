import { db } from "@/db";

/**
 * フォロー関係をチェック
 * Kyselyに移行済み
 */
export async function isFollowing(followerId: string, followingId: string) {
	// フォロー関係を直接チェック（ユーザーの存在チェックは外部キー制約で保証される）
	const follow = await db
		.selectFrom("follows")
		.selectAll()
		.where("followerId", "=", followerId)
		.where("followingId", "=", followingId)
		.executeTakeFirst();

	return !!follow;
}
