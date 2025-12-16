import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { contents, pages, segments } from "@/drizzle/schema";

/**
 * segment から page を解決する（page または pageComment 経由）
 * @returns page が見つかった場合は { id, slug }、見つからない場合は null
 */
export async function findPageBySegmentId(segmentId: number) {
	// まず、segment -> content -> page を試す
	const [pageResult] = await db
		.select({
			id: pages.id,
			slug: pages.slug,
		})
		.from(segments)
		.innerJoin(contents, eq(segments.contentId, contents.id))
		.innerJoin(pages, eq(contents.id, pages.id))
		.where(eq(segments.id, segmentId))
		.limit(1);

	return pageResult ?? null;
}
