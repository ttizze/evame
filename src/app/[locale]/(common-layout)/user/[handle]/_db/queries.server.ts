import { sql } from "kysely";
import { db } from "@/db";

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
	const results = await db
		.selectFrom("follows")
		.innerJoin("users", "follows.followerId", "users.id")
		.select([
			"follows.id",
			"follows.createdAt",
			"follows.followerId",
			"follows.followingId",
			"users.id as followerUserId",
			"users.handle as followerHandle",
			"users.name as followerName",
			"users.image as followerImage",
			"users.emailVerified as followerEmailVerified",
			"users.createdAt as followerCreatedAt",
			"users.updatedAt as followerUpdatedAt",
			"users.profile as followerProfile",
			"users.twitterHandle as followerTwitterHandle",
			"users.totalPoints as followerTotalPoints",
			"users.isAi as followerIsAI",
			"users.plan as followerPlan",
		])
		.where("follows.followingId", "=", userId)
		.execute();

	return results.map((r) => ({
		id: r.id,
		createdAt: r.createdAt,
		followerId: r.followerId,
		followingId: r.followingId,
		follower: {
			id: r.followerUserId,
			handle: r.followerHandle,
			name: r.followerName,
			image: r.followerImage,
			emailVerified: r.followerEmailVerified,
			createdAt: r.followerCreatedAt,
			updatedAt: r.followerUpdatedAt,
			profile: r.followerProfile,
			twitterHandle: r.followerTwitterHandle,
			totalPoints: r.followerTotalPoints,
			isAi: r.followerIsAI,
			plan: r.followerPlan,
		},
	}));
}

export async function fetchFollowingList(userId: string) {
	const results = await db
		.selectFrom("follows")
		.innerJoin("users", "follows.followingId", "users.id")
		.select([
			"follows.id",
			"follows.createdAt",
			"follows.followerId",
			"follows.followingId",
			"users.id as followingUserId",
			"users.handle as followingHandle",
			"users.name as followingName",
			"users.image as followingImage",
			"users.emailVerified as followingEmailVerified",
			"users.createdAt as followingCreatedAt",
			"users.updatedAt as followingUpdatedAt",
			"users.profile as followingProfile",
			"users.twitterHandle as followingTwitterHandle",
			"users.totalPoints as followingTotalPoints",
			"users.isAi as followingIsAI",
			"users.plan as followingPlan",
		])
		.where("follows.followerId", "=", userId)
		.execute();

	return results.map((r) => ({
		id: r.id,
		createdAt: r.createdAt,
		followerId: r.followerId,
		followingId: r.followingId,
		following: {
			id: r.followingUserId,
			handle: r.followingHandle,
			name: r.followingName,
			image: r.followingImage,
			emailVerified: r.followingEmailVerified,
			createdAt: r.followingCreatedAt,
			updatedAt: r.followingUpdatedAt,
			profile: r.followingProfile,
			twitterHandle: r.followingTwitterHandle,
			totalPoints: r.followingTotalPoints,
			isAi: r.followingIsAI,
			plan: r.followingPlan,
		},
	}));
}
