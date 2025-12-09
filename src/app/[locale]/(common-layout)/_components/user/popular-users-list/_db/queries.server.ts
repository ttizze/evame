import { db } from "@/db/kysely";

interface PopularUser {
	id: string;
	name: string;
	handle: string;
	image: string;
	_count: {
		followers: number;
	};
}

/**
 * Fetches popular users based on follower count
 * @param limit Maximum number of users to return
 * @returns Array of popular users with follower count
 */
export async function fetchPopularUsers(limit: number): Promise<PopularUser[]> {
	const users = await db
		.selectFrom("users")
		.leftJoin("follows", "follows.followingId", "users.id")
		.select([
			"users.id",
			"users.name",
			"users.handle",
			"users.image",
			({ fn }) => fn.count<number>("follows.followerId").as("followerCount"),
		])
		.groupBy(["users.id", "users.name", "users.handle", "users.image"])
		.orderBy("followerCount", "desc")
		.limit(limit)
		.execute();

	return users.map((user) => ({
		id: user.id,
		name: user.name,
		handle: user.handle,
		image: user.image,
		_count: {
			followers: Number(user.followerCount) || 0,
		},
	}));
}
