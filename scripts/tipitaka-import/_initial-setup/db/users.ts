import { db } from "@/db";

export async function findUserByHandle(handle: string) {
	const user = await db
		.selectFrom("users")
		.selectAll()
		.where("handle", "=", handle)
		.executeTakeFirst();
	return user ?? null;
}
