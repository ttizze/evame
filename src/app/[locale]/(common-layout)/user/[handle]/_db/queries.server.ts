import { count, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { follows, users } from "@/drizzle/schema";

export async function getFollowCounts(userId: string) {
	const [[followersResult], [followingResult]] = await Promise.all([
		db
			.select({ count: count() })
			.from(follows)
			.where(eq(follows.followingId, userId)),
		db
			.select({ count: count() })
			.from(follows)
			.where(eq(follows.followerId, userId)),
	]);

	return {
		followers: Number(followersResult?.count ?? 0),
		following: Number(followingResult?.count ?? 0),
	};
}

export async function fetchFollowerList(userId: string) {
	return db
		.select({
			id: follows.id,
			createdAt: follows.createdAt,
			followerId: follows.followerId,
			followingId: follows.followingId,
			follower: {
				id: users.id,
				handle: users.handle,
				name: users.name,
				image: users.image,
				emailVerified: users.emailVerified,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(follows)
		.innerJoin(users, eq(follows.followerId, users.id))
		.where(eq(follows.followingId, userId));
}

export async function fetchFollowingList(userId: string) {
	return db
		.select({
			id: follows.id,
			createdAt: follows.createdAt,
			followerId: follows.followerId,
			followingId: follows.followingId,
			following: {
				id: users.id,
				handle: users.handle,
				name: users.name,
				image: users.image,
				emailVerified: users.emailVerified,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
				profile: users.profile,
				twitterHandle: users.twitterHandle,
				totalPoints: users.totalPoints,
				isAI: users.isAI,
				plan: users.plan,
			},
		})
		.from(follows)
		.innerJoin(users, eq(follows.followingId, users.id))
		.where(eq(follows.followerId, userId));
}
