import type { Transaction } from "kysely";
import type { DB } from "@/db/types";

export async function claimPagePublication(
	tx: Transaction<DB>,
	pageId: number,
) {
	return tx
		.updateTable("pages")
		.set({ publicationNotified: true })
		.where("id", "=", pageId)
		.where("status", "=", "PUBLIC")
		.where("publicationNotified", "=", false)
		.returning(["userId", "parentId"])
		.executeTakeFirst();
}

export async function insertPublicationNotifications(
	tx: Transaction<DB>,
	pageId: number,
	authorId: string,
) {
	await tx
		.insertInto("notifications")
		.columns(["userId", "actorId", "type", "pageId"])
		.expression((expression) =>
			expression
				.selectFrom("follows")
				.select((builder) => [
					"followerId as userId",
					builder.val(authorId).as("actorId"),
					builder.val("PAGE_PUBLISHED" as const).as("type"),
					builder.val(pageId).as("pageId"),
				])
				.where("followingId", "=", authorId)
				.where("followerId", "!=", authorId),
		)
		.execute();
}
