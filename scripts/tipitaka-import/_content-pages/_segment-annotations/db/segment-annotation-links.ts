import { prisma } from "@/lib/prisma";

export async function createSegmentAnnotationLinks(
	links: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}>,
): Promise<void> {
	if (links.length === 0) return;

	await prisma.segmentAnnotationLink.createMany({
		data: links,
		skipDuplicates: true,
	});
}
