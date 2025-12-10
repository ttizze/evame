import { count, desc, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { follows, users } from "@/drizzle/schema";

/**
 * Fetches popular users based on follower count
 * Drizzleに移行済み
 * @param limit Maximum number of users to return
 * @returns Array of popular users with follower count
 */
export async function fetchPopularUsers(limit: number) {
	return await db
		.select({
			id: users.id,
			name: users.name,
			handle: users.handle,
			image: users.image,
			_count: {
				followers: count(follows.id),
			},
		})
		.from(users)
		.leftJoin(follows, eq(users.id, follows.followingId))
		.groupBy(users.id, users.name, users.handle, users.image)
		.orderBy(desc(count(follows.id)))
		.limit(limit);
}
