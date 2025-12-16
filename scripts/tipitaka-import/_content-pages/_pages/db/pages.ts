import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { pages } from "@/drizzle/schema";

/**
 * スラグとユーザーIDからページを取得する
 */
export async function findPageBySlugAndUserId(
	slug: string,
	userId: string,
): Promise<{ id: number }> {
	const [page] = await db
		.select({ id: pages.id })
		.from(pages)
		.where(and(eq(pages.slug, slug), eq(pages.userId, userId)))
		.limit(1);

	if (!page) {
		throw new Error(`Page with slug ${slug} and userId ${userId} not found`);
	}

	return page;
}
