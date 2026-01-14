import { db } from "@/db";

/**
 * segment から page を解決する（page または pageComment 経由）
 * @returns page が見つかった場合は { id, slug }、見つからない場合は null
 */
export async function findPageBySegmentId(segmentId: number) {
	// まず、segment -> content -> page を試す
	const pageResult = await db
		.selectFrom("segments")
		.innerJoin("contents", "segments.contentId", "contents.id")
		.innerJoin("pages", "contents.id", "pages.id")
		.select(["pages.id", "pages.slug"])
		.where("segments.id", "=", segmentId)
		.executeTakeFirst();

	return pageResult ?? null;
}
