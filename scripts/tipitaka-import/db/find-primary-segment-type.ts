import { prisma } from "@/lib/prisma";

/**
 * PRIMARYセグメントタイプのIDを取得する
 */
export async function findPrimarySegmentTypeId(): Promise<number> {
	const primarySegmentType = await prisma.segmentType.findFirst({
		where: { key: "PRIMARY" },
		select: { id: true },
	});
	if (!primarySegmentType) {
		throw new Error('Segment type "PRIMARY" not found');
	}
	return primarySegmentType.id;
}

export async function findPrimarySegmentType(): Promise<number> {
	const primarySegmentType = await prisma.segmentType.findFirst({
		where: { key: "PRIMARY" },
	});
	if (!primarySegmentType) {
		throw new Error('Segment type "PRIMARY" not found');
	}
	return primarySegmentType.id;
}
