import { db } from "@/db";

/**
 * segment から page を解決する
 * @returns page が見つかった場合は { id, slug }、見つからない場合は null
 */
export async function findPageBySegmentId(segmentId: number) {
	const pageResult = await db
		.selectFrom("segments")
		.innerJoin("pages", "segments.contentId", "pages.id")
		.select(["pages.id as id", "pages.slug as slug"])
		.where("segments.id", "=", segmentId)
		.executeTakeFirst();

	if (!pageResult) return null;
	const { id, slug } = pageResult;
	if (id == null || slug == null) return null;
	return { id, slug };
}
