import { db } from "@/db";

export async function findPageForSync(userId: string, slug: string) {
	return await db
		.selectFrom("pages")
		.select(["id", "status", "mdastJson", "publishedAt"])
		.where("slug", "=", slug)
		.where("userId", "=", userId)
		.executeTakeFirst();
}
