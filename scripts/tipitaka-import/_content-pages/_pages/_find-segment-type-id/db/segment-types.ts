import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { segmentTypes } from "@/drizzle/schema";

/**
 * COMMENTARYセグメントタイプのIDを取得する
 * @param label セグメントタイプのlabel
 */
export async function findCommentarySegmentTypeId(
	label: string,
): Promise<number> {
	const [segmentType] = await db
		.select({ id: segmentTypes.id })
		.from(segmentTypes)
		.where(
			and(eq(segmentTypes.key, "COMMENTARY"), eq(segmentTypes.label, label)),
		)
		.limit(1);

	if (!segmentType) {
		throw new Error(
			`Segment type not found for commentary with label: ${label}`,
		);
	}
	return segmentType.id;
}
