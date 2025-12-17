import { sql } from "kysely";
import { db } from "@/db";

/**
 * ページのいいねをトグルする
 * Kysely版に移行済み
 */
export async function togglePageLike(pageId: number, currentUserId: string) {
	// ページを取得（通知作成のためにuserIdが必要）
	const page = await db
		.selectFrom("pages")
		.select(["id", "userId"])
		.where("id", "=", pageId)
		.executeTakeFirst();

	if (!page) {
		throw new Error("Page not found");
	}

	// 既存のいいねを削除（存在する場合）
	const deleted = await db
		.deleteFrom("likePages")
		.where("pageId", "=", pageId)
		.where("userId", "=", currentUserId)
		.returningAll()
		.execute();

	let liked: boolean;
	if (deleted.length > 0) {
		// いいねを削除した
		liked = false;
	} else {
		// いいねを作成
		await db
			.insertInto("likePages")
			.values({
				pageId: page.id,
				userId: currentUserId,
			})
			.execute();
		await createPageLikeNotification({
			pageId: page.id,
			targetUserId: page.userId,
			actorId: currentUserId,
		});
		liked = true;
	}

	// 更新後の最新のいいね数を取得する
	const result = await db
		.selectFrom("likePages")
		.select(sql<number>`count(*)::int`.as("count"))
		.where("pageId", "=", page.id)
		.executeTakeFirst();

	const likeCount = Number(result?.count ?? 0);

	return { liked, likeCount };
}

/**
 * ページいいね通知を作成
 * Kysely版に移行済み
 */
async function createPageLikeNotification({
	pageId,
	targetUserId,
	actorId,
}: {
	pageId: number;
	targetUserId: string;
	actorId: string;
}) {
	await db
		.insertInto("notifications")
		.values({
			pageId,
			userId: targetUserId,
			actorId,
			type: "PAGE_LIKE",
		})
		.execute();
}
