import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { follows, notifications } from "@/drizzle/schema";

export async function createFollow(followerId: string, followingId: string) {
	if (followerId === followingId) {
		throw new Error("Follower and following cannot be the same");
	}
	const [created] = await db
		.insert(follows)
		.values({
			followerId,
			followingId,
		})
		.returning();
	return created;
}

export async function deleteFollow(followerId: string, followingId: string) {
	const [deleted] = await db
		.delete(follows)
		.where(
			and(
				eq(follows.followerId, followerId),
				eq(follows.followingId, followingId),
			),
		)
		.returning();
	return deleted;
}

export async function createNotificationFollow(
	actorId: string,
	userId: string,
) {
	const [notification] = await db
		.insert(notifications)
		.values({
			userId: userId,
			type: "FOLLOW",
			actorId: actorId,
		})
		.returning();
	return notification;
}
