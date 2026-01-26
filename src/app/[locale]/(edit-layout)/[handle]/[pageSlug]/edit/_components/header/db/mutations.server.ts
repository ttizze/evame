import { db } from "@/db";
import type { PageStatus } from "@/db/types";

export async function updatePageStatus(pageId: number, status: PageStatus) {
	const updated = await db
		.updateTable("pages")
		.set({ status })
		.where("id", "=", pageId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}
