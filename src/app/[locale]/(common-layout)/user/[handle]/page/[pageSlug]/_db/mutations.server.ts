import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { pageViews } from "@/drizzle/schema";

export async function incrementPageView(pageId: number) {
	// 既存レコードを確認
	const existing = await db
		.select({ count: pageViews.count })
		.from(pageViews)
		.where(eq(pageViews.pageId, pageId))
		.limit(1);

	if (existing.length > 0) {
		// 既存の場合はcountをincrement
		await db
			.update(pageViews)
			.set({ count: existing[0].count + 1 })
			.where(eq(pageViews.pageId, pageId));
	} else {
		// 新規の場合は作成
		await db.insert(pageViews).values({ pageId, count: 1 });
	}
}
