import { and, count, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { likePages, notifications, pages } from "@/drizzle/schema";

/**
 * ページのいいねをトグルする
 * Drizzle版に移行済み
 */
export async function togglePageLike(pageId: number, currentUserId: string) {
	// ページを取得（通知作成のためにuserIdが必要）
	const [page] = await db
		.select({ id: pages.id, userId: pages.userId })
		.from(pages)
		.where(eq(pages.id, pageId))
		.limit(1);

	if (!page) {
		throw new Error("Page not found");
	}

	// 既存のいいねを削除（存在する場合）
	const deleted = await db
		.delete(likePages)
		.where(
			and(eq(likePages.pageId, pageId), eq(likePages.userId, currentUserId)),
		)
		.returning();

	let liked: boolean;
	if (deleted.length > 0) {
		// いいねを削除した
		liked = false;
	} else {
		// いいねを作成
		await db.insert(likePages).values({
			pageId: page.id,
			userId: currentUserId,
		});
		await createPageLikeNotification({
			pageId: page.id,
			targetUserId: page.userId,
			actorId: currentUserId,
		});
		liked = true;
	}

	// 更新後の最新のいいね数を取得する
	const [result] = await db
		.select({ count: count() })
		.from(likePages)
		.where(eq(likePages.pageId, page.id));

	const likeCount = Number(result?.count ?? 0);

	return { liked, likeCount };
}

/**
 * ページいいね通知を作成
 * Drizzle版に移行済み
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
	await db.insert(notifications).values({
		pageId,
		userId: targetUserId,
		actorId,
		type: "PAGE_LIKE",
	});
}
