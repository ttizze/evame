import { prisma } from "~/utils/prisma";

export async function hasExistingTranslation(
	pageId: number,
	locale: string,
): Promise<boolean> {
	const titlePageSegment = await prisma.pageSegment.findFirst({
		where: {
			pageId,
			number: 0,
		},
		include: {
			pageSegmentTranslations: {
				where: {
					locale,
					isArchived: false,
				},
			},
		},
	});

	return titlePageSegment?.pageSegmentTranslations.length
		? titlePageSegment.pageSegmentTranslations.length > 0
		: false;
}

export async function getLatestPageSegments(pageId: number) {
	return await prisma.pageSegment.findMany({
		where: {
			pageId,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			number: true,
			text: true,
			createdAt: true,
		},
	});
}

export async function getLatestPageCommentSegments(pageId: number) {
	const pageComments = await prisma.pageComment.findMany({
		where: {
			pageId,
		},
		include: {
			pageCommentSegments: {
				select: { id: true, number: true, text: true, createdAt: true },
			},
		},
	});

	return pageComments.flatMap((comment) => comment.pageCommentSegments);
}
