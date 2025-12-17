import { db } from "@/db";
import type { Pagestatus } from "@/db/types";

export async function updatePageStatus(pageId: number, status: Pagestatus) {
	const updated = await db
		.updateTable("pages")
		.set({ status })
		.where("id", "=", pageId)
		.returningAll()
		.executeTakeFirst();
	return updated;
}
