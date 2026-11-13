import { db } from "@/db";

export async function fetchUserByHandle(handle: string) {
	return db
		.selectFrom("users")
		.select(["id", "handle", "name", "image", "profile", "twitterHandle"])
		.where("handle", "=", handle)
		.executeTakeFirst();
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
