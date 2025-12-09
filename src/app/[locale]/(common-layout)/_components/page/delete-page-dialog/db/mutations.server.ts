import { db } from "@/db/kysely";

export async function archivePage(pageId: number, userId: string) {
	const page = await db
		.selectFrom("pages")
		.selectAll()
		.where("id", "=", pageId)
		.where("userId", "=", userId)
		.executeTakeFirst();

	if (!page) {
		throw new Error("Page not found or unauthorized");
	}

	const result = await db
		.updateTable("pages")
		.set({ status: "ARCHIVE" })
		.where("id", "=", pageId)
		.returningAll()
		.executeTakeFirst();

	return result;
}
