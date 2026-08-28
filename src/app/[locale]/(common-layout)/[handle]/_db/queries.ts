import { sql } from "kysely";
import { db } from "@/db";

export async function fetchUserByHandle(handle: string) {
	return db
		.selectFrom("users")
		.select(["id", "handle", "name", "image", "profile", "twitterHandle"])
		.where("handle", "=", handle)
		.executeTakeFirst();
}

export async function getFollowCounts(userId: string) {
	const [followersResult, followingResult] = await Promise.all([
		db
			.selectFrom("follows")
			.select(sql<number>`count(*)::int`.as("count"))
			.where("followingId", "=", userId)
			.executeTakeFirst(),
		db
			.selectFrom("follows")
			.select(sql<number>`count(*)::int`.as("count"))
			.where("followerId", "=", userId)
			.executeTakeFirst(),
	]);

	return {
		followers: Number(followersResult?.count ?? 0),
		following: Number(followingResult?.count ?? 0),
	};
}

export async function fetchFollowerList(userId: string) {
	return db
		.selectFrom("follows")
		.innerJoin("users", "follows.followerId", "users.id")
		.select(["users.handle", "users.name", "users.image"])
		.where("follows.followingId", "=", userId)
		.execute();
}

export async function fetchFollowingList(userId: string) {
	return db
		.selectFrom("follows")
		.innerJoin("users", "follows.followingId", "users.id")
		.select(["users.handle", "users.name", "users.image"])
		.where("follows.followerId", "=", userId)
		.execute();
}

export async function isFollowing(followerId: string, followingId: string) {
	const follow = await db
		.selectFrom("follows")
		.select("follows.id")
		.where("followerId", "=", followerId)
		.where("followingId", "=", followingId)
		.executeTakeFirst();

	return Boolean(follow);
}
