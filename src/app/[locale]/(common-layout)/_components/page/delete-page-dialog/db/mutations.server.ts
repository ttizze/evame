import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";

/**
 * ページをアーカイブ状態にする
 * Drizzle版に移行済み
 */
export async function archivePage(pageId: number, userId: string) {
	const [result] = await db
		.update(pages)
		.set({ status: "ARCHIVE" })
		.where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
		.returning();

	if (!result) {
		throw new Error("Page not found or unauthorized");
	}

	return result;
}
