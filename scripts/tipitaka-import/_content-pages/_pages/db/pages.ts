import { db } from "@/db";

/**
 * スラグとユーザーIDからページを取得する
 */
export async function findPageBySlugAndUserId(
	slug: string,
	userId: string,
): Promise<{ id: number }> {
	const page = await db
		.selectFrom("pages")
		.select("id")
		.where("slug", "=", slug)
		.where("userId", "=", userId)
		.executeTakeFirst();

	if (!page) {
		throw new Error(`Page with slug ${slug} and userId ${userId} not found`);
	}

	return page;
}
