import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	contents,
	pages,
	segments,
	segmentTranslations,
} from "@/drizzle/schema";

export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	const result = await db
		.select({ pageId: pages.id })
		.from(segmentTranslations)
		.innerJoin(segments, eq(segmentTranslations.segmentId, segments.id))
		.innerJoin(contents, eq(segments.contentId, contents.id))
		.innerJoin(pages, eq(contents.id, pages.id))
		.where(eq(segmentTranslations.id, segmentTranslationId))
		.limit(1);

	const id = result[0]?.pageId;
	if (!id) {
		throw new Error("Page not found");
	}
	return id;
}
