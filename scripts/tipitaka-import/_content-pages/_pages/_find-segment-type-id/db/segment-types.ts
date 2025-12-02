import { prisma } from "@/lib/prisma";

/**
 * COMMENTARYセグメントタイプのIDを取得する
 * @param label セグメントタイプのlabel
 */
export async function findCommentarySegmentTypeId(
	label: string,
): Promise<number> {
	const segmentType = await prisma.segmentType.findFirst({
		where: { key: "COMMENTARY", label },
		select: { id: true },
	});
	if (!segmentType) {
		throw new Error(
			`Segment type not found for commentary with label: ${label}`,
		);
	}
	return segmentType.id;
}
