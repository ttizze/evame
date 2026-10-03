import { db } from "@/db";

/** segment から本文またはコメントの所属ページを解決する。 */
export async function findPageBySegmentId(segmentId: number) {
	const pageResult = await db
		.selectFrom("segments")
		.leftJoin("pages", "segments.contentId", "pages.id")
		.leftJoin("pageComments", "segments.contentId", "pageComments.id")
		.leftJoin("pages as commentPage", "pageComments.pageId", "commentPage.id")
		.select((eb) => [
			eb.fn.coalesce("pages.id", "commentPage.id").as("id"),
			eb.fn.coalesce("pages.slug", "commentPage.slug").as("slug"),
		])
		.where("segments.id", "=", segmentId)
		.executeTakeFirst();

	if (!pageResult?.id || !pageResult.slug) return null;
	return { id: pageResult.id, slug: pageResult.slug };
}
