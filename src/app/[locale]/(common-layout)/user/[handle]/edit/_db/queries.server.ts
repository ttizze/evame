import { db } from "@/db";

/**
 * handleが使用されているかチェック
 * Kyselyに移行済み
 */
export async function isHandleTaken(handle: string): Promise<boolean> {
	const result = await db
		.selectFrom("users")
		.select("id")
		.where("handle", "=", handle)
		.executeTakeFirst();
	return !!result;
}
