import { db } from "@/db/kysely";

export async function togglePagePublicStatus(
	pageId: number,
	currentUserId: string,
) {
	const page = await db
		.selectFrom("pages")
		.selectAll()
		.where("id", "=", pageId)
		.executeTakeFirst();

	if (!page) {
		throw new Error("Page not found");
	}
	if (page.userId !== currentUserId) {
		throw new Error("Unauthorized");
	}

	const newStatus = page.status === "PUBLIC" ? "DRAFT" : "PUBLIC";

	return db
		.updateTable("pages")
		.set({ status: newStatus })
		.where("id", "=", pageId)
		.where("userId", "=", currentUserId)
		.returningAll()
		.executeTakeFirst();
}
