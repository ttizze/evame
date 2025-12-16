import { db } from "@/db";

export async function incrementPageView(pageId: number) {
	// 既存レコードを確認
	const existing = await db
		.selectFrom("pageViews")
		.select("count")
		.where("pageId", "=", pageId)
		.executeTakeFirst();

	if (existing) {
		// 既存の場合はcountをincrement
		await db
			.updateTable("pageViews")
			.set({ count: existing.count + 1 })
			.where("pageId", "=", pageId)
			.execute();
	} else {
		// 新規の場合は作成
		await db.insertInto("pageViews").values({ pageId, count: 1 }).execute();
	}
}
