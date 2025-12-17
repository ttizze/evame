import { db } from "@/db";

export async function togglePagePublicStatus(
	pageId: number,
	currentUserId: string,
) {
	// 認証チェックと現在のステータスを取得
	const page = await db
		.selectFrom("pages")
		.select(["id", "status"])
		.where("id", "=", pageId)
		.where("userId", "=", currentUserId)
		.executeTakeFirst();

	if (!page) {
		// ページが見つからない、または認証エラー
		// どちらの場合か区別するために、まずページの存在確認
		const existingPage = await db
			.selectFrom("pages")
			.select("id")
			.where("id", "=", pageId)
			.executeTakeFirst();
		if (!existingPage) {
			throw new Error("Page not found");
		}
		throw new Error("Unauthorized");
	}

	// ステータスを切り替え
	const newStatus = page.status === "PUBLIC" ? "DRAFT" : "PUBLIC";
	const updatedPage = await db
		.updateTable("pages")
		.set({ status: newStatus })
		.where("id", "=", pageId)
		.where("userId", "=", currentUserId)
		.returningAll()
		.executeTakeFirst();

	if (!updatedPage) {
		throw new Error("Failed to update page status");
	}

	return updatedPage;
}
