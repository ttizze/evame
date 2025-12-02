import { prisma } from "@/lib/prisma";

export interface SegmentRecord {
	id: number;
	number: number;
	text: string;
}

export async function findSegmentsByContentId(
	contentId: number,
): Promise<SegmentRecord[]> {
	return prisma.segment.findMany({
		where: { contentId },
		orderBy: { number: "asc" },
		select: { id: true, number: true, text: true },
	});
}
