import { db } from "@/db";

/**
 * handleからユーザーを取得
 * Kyselyに移行済み
 */
export async function fetchUserByHandle(handle: string) {
	const result = await db
		.selectFrom("users")
		.selectAll()
		.where("handle", "=", handle)
		.executeTakeFirst();
	return result ?? null;
}
