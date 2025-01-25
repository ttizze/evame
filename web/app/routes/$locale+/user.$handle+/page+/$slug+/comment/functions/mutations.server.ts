import { prisma } from "~/utils/prisma";

export async function createPageCommentSegments(
	pageCommentId: number,
	segments: Array<{
		text: string;
		textAndOccurrenceHash: string;
		number: number;
	}>,
) {
	await prisma.pageCommentSegment.createMany({
		data: segments.map((segment) => ({
			pageCommentId,
			...segment,
		})),
	});
}
