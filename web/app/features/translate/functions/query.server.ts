import { prisma } from "~/utils/prisma";

export async function hasExistingTranslation(
	pageId: number,
	locale: string,
): Promise<boolean> {
	const titleSourceText = await prisma.sourceText.findFirst({
		where: {
			pageId,
			number: 0,
		},
		include: {
			translateTexts: {
				where: {
					locale,
					isArchived: false,
				},
			},
		},
	});

	return titleSourceText?.translateTexts.length
		? titleSourceText.translateTexts.length > 0
		: false;
}

export async function getLatestSourceTexts(pageId: number) {
	return await prisma.sourceText.findMany({
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
