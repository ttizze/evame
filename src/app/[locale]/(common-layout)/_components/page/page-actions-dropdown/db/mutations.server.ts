import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";

export async function togglePagePublicStatus(
	pageId: number,
	currentUserId: string,
) {
	// 認証チェックと現在のステータスを取得
	const [page] = await db
		.select({ id: pages.id, status: pages.status })
		.from(pages)
		.where(and(eq(pages.id, pageId), eq(pages.userId, currentUserId)))
		.limit(1);

	if (!page) {
		// ページが見つからない、または認証エラー
		// どちらの場合か区別するために、まずページの存在確認
		const [existingPage] = await db
			.select({ id: pages.id })
			.from(pages)
			.where(eq(pages.id, pageId))
			.limit(1);
		if (!existingPage) {
			throw new Error("Page not found");
		}
		throw new Error("Unauthorized");
	}

	// ステータスを切り替え
	const newStatus = page.status === "PUBLIC" ? "DRAFT" : "PUBLIC";
	const [updatedPage] = await db
		.update(pages)
		.set({ status: newStatus })
		.where(and(eq(pages.id, pageId), eq(pages.userId, currentUserId)))
		.returning();

	if (!updatedPage) {
		throw new Error("Failed to update page status");
	}

	return updatedPage;
}
