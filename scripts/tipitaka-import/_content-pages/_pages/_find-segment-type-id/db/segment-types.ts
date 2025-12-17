import { db } from "@/db";

/**
 * COMMENTARYセグメントタイプのIDを取得する
 * @param label セグメントタイプのlabel
 */
export async function findCommentarySegmentTypeId(
	label: string,
): Promise<number> {
	const segmentType = await db
		.selectFrom("segmentTypes")
		.select("id")
		.where("key", "=", "COMMENTARY")
		.where("label", "=", label)
		.executeTakeFirst();

	if (!segmentType) {
		throw new Error(
			`Segment type not found for commentary with label: ${label}`,
		);
	}
	return segmentType.id;
}
