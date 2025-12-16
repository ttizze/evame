import { db } from "@/db";

export async function createFollow(followerId: string, followingId: string) {
	if (followerId === followingId) {
		throw new Error("Follower and following cannot be the same");
	}
	const created = await db
		.insertInto("follows")
		.values({
			followerId,
			followingId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return created;
}

export async function deleteFollow(followerId: string, followingId: string) {
	const deleted = await db
		.deleteFrom("follows")
		.where("followerId", "=", followerId)
		.where("followingId", "=", followingId)
		.returningAll()
		.executeTakeFirst();
	return deleted;
}

export async function createNotificationFollow(
	actorId: string,
	userId: string,
) {
	const notification = await db
		.insertInto("notifications")
		.values({
			userId: userId,
			type: "FOLLOW",
			actorId: actorId,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
	return notification;
}
