import { prisma } from "@/lib/prisma";

export async function fetchPageWithPageSegments(pageId: number) {
	const pageWithSegments = await prisma.page.findFirst({
		where: { id: pageId },
		select: {
			id: true,
			slug: true,
			content: true,
			createdAt: true,
			pageSegments: {
				select: {
					id: true,
					number: true,
					text: true,
				},
			},
		},
	});

	if (!pageWithSegments) return null;
	const title = pageWithSegments.pageSegments.filter(
		(item) => item.number === 0,
	)[0].text;

	return {
		...pageWithSegments,
		title,
	};
}

export async function fetchLatestUserTranslationJob(
	pageId: number,
	userId: string,
) {
	return await prisma.translationJob.findFirst({
		where: { pageId, userId },
		orderBy: { createdAt: "desc" },
	});
}

export async function fetchLikeCount(pageId: number) {
	const likeCount = await prisma.likePage.count({
		where: { pageId },
	});
	return likeCount;
}

export async function fetchIsLikedByUser(
	pageId: number,
	userId?: string,
	guestId?: string,
) {
	if (userId) {
		const like = await prisma.likePage.findFirst({
			where: { pageId, userId },
		});
		return !!like;
	}
	if (guestId) {
		const like = await prisma.likePage.findFirst({
			where: { pageId, guestId },
		});
		return !!like;
	}
	return false;
}

export async function fetchPageCommentsCount(pageId: number) {
	const pageCommentsCount = await prisma.pageComment.count({
		where: { pageId },
	});
	return pageCommentsCount;
}

export async function fetchPageWithTitleAndComments(pageId: number) {
	const pageWithComments = await prisma.page.findFirst({
		where: { id: pageId },
		include: {
			pageSegments: { where: { number: 0 } },
			pageComments: {
				include: {
					pageCommentSegments: true,
				},
			},
		},
	});
	if (!pageWithComments) return null;
	const title = pageWithComments?.pageSegments[0].text;
	if (!title) return null;
	return {
		...pageWithComments,
		title,
	};
}
