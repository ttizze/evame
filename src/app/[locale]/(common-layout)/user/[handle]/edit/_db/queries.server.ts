import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

/**
 * handleが使用されているかチェック
 * Drizzleに移行済み
 */
export async function isHandleTaken(handle: string): Promise<boolean> {
	const result = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.handle, handle))
		.limit(1);
	return !!result[0];
}
