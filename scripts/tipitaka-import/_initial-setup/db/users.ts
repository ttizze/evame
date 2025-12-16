import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { users } from "@/drizzle/schema";

export async function findUserByHandle(handle: string) {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.handle, handle))
		.limit(1);
	return user ?? null;
}
