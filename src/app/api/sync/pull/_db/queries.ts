import { db } from "@/db";

export async function listActivePagesForSync(userId: string) {
	return await db
		.selectFrom("pages")
		.select(["id", "slug", "mdastJson", "publishedAt"])
		.where("userId", "=", userId)
		.where("status", "!=", "ARCHIVE")
		.execute();
}
