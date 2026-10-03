import { db } from "@/db";

export async function togglePagePublicStatus(
	pageId: number,
	currentUserId: string,
) {
	const page = await db
		.selectFrom("pages")
		.select(["id", "status"])
		.where("id", "=", pageId)
		.where("userId", "=", currentUserId)
		.executeTakeFirst();

	if (!page) {
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
