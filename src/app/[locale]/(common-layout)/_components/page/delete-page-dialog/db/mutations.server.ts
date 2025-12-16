import { db } from "@/db";

/**
 * ページをアーカイブ状態にする
 * Kysely版に移行済み
 */
export async function archivePage(pageId: number, userId: string) {
	const result = await db
		.updateTable("pages")
		.set({ status: "ARCHIVE" })
		.where("id", "=", pageId)
		.where("userId", "=", userId)
		.returningAll()
		.executeTakeFirst();

	if (!result) {
		throw new Error("Page not found or unauthorized");
	}

	return result;
}
