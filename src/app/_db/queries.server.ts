import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

/**
 * handleからユーザーを取得
 * Drizzleに移行済み
 */
export async function fetchUserByHandle(handle: string) {
	const result = await db
		.select()
		.from(users)
		.where(eq(users.handle, handle))
		.limit(1);
	return result[0] ?? null;
}
