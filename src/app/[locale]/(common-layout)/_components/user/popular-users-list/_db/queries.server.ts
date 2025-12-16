import { sql } from "kysely";
import { db } from "@/db";

/**
 * Fetches popular users based on follower count
 * Kyselyに移行済み
 * @param limit Maximum number of users to return
 * @returns Array of popular users with follower count
 */
export async function fetchPopularUsers(limit: number) {
	const results = await db
		.selectFrom("users")
		.leftJoin("follows", "users.id", "follows.followingId")
		.select([
			"users.id",
			"users.name",
			"users.handle",
			"users.image",
			sql<number>`count(follows.id)::int`.as("followersCount"),
		])
		.groupBy(["users.id", "users.name", "users.handle", "users.image"])
		.orderBy(sql`count(follows.id)`, "desc")
		.limit(limit)
		.execute();

	return results.map((r) => ({
		id: r.id,
		name: r.name,
		handle: r.handle,
		image: r.image,
		_count: {
			followers: r.followersCount,
		},
	}));
}
