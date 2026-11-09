import { db } from "@/db";

export async function setPageCommentsEnabled(
	pageId: number,
	userId: string,
	enabled: boolean,
) {
	return db
		.updateTable("pages")
		.set({ commentsEnabled: enabled })
		.where("id", "=", pageId)
		.where("userId", "=", userId)
		.where("status", "!=", "ARCHIVE")
		.returning("commentsEnabled")
		.executeTakeFirst();
}
