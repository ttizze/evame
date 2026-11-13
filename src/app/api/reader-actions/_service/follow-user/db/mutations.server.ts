import type { Transaction } from "kysely";
import type { DB } from "@/db/types";

export async function createFollow(
	tx: Transaction<DB>,
	followerId: string,
	followingId: string,
) {
	return tx
		.insertInto("follows")
		.values({
			followerId,
			followingId,
		})
		.onConflict((conflict) =>
			conflict.columns(["followerId", "followingId"]).doNothing(),
		)
		.returning("id")
		.executeTakeFirst();
}

export async function deleteFollow(
	tx: Transaction<DB>,
	followerId: string,
	followingId: string,
) {
	await tx
		.deleteFrom("follows")
		.where("followerId", "=", followerId)
		.where("followingId", "=", followingId)
		.execute();
}

export async function createNotificationFollow(
	tx: Transaction<DB>,
	actorId: string,
	userId: string,
) {
	await tx
		.insertInto("notifications")
		.values({
			userId,
			type: "FOLLOW",
			actorId,
		})
		.execute();
}
