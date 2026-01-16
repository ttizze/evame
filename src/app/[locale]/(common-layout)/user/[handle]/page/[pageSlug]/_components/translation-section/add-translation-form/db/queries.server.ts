import { db } from "@/db";

/**
 * segment から page を解決する（page または pageComment 経由）
 * @returns page が見つかった場合は { id, slug }、見つからない場合は null
 */
export async function findPageBySegmentId(segmentId: number) {
	// segment -> content -> page or pageComment -> page を解決する
	const pageResult = await db
		.selectFrom("segments")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.leftJoin("pages", "contents.id", "pages.id")
		.leftJoin("pageComments", "contents.id", "pageComments.id")
		.leftJoin("pages as commentPages", "pageComments.pageId", "commentPages.id")
		.select((eb) => [
			eb.fn.coalesce("pages.id", "commentPages.id").as("id"),
			eb.fn.coalesce("pages.slug", "commentPages.slug").as("slug"),
		])
		.where("segments.id", "=", segmentId)
		.executeTakeFirst();

	if (!pageResult) return null;
	const { id, slug } = pageResult;
	if (id == null || slug == null) return null;
	return { id, slug };
}
