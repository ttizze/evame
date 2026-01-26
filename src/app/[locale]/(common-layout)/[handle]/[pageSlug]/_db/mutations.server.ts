import { sql } from "kysely";
import { db } from "@/db";

export async function incrementPageView(pageId: number): Promise<number> {
	const result = await db
		.insertInto("pageViews")
		.values({ pageId, count: 1 })
		.onConflict((oc) =>
			oc.column("pageId").doUpdateSet({ count: sql`page_views.count + 1` }),
		)
		.returning("count")
		.executeTakeFirstOrThrow();
	return result.count;
}
