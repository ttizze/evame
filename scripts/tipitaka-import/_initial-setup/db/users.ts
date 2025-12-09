import { db } from "../../../../src/db/kysely";

export async function findUserByHandle(handle: string) {
	return db
		.selectFrom("users")
		.selectAll()
		.where("handle", "=", handle)
		.executeTakeFirst();
}
