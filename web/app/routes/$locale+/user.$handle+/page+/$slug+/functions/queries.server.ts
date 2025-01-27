import { prisma } from "~/utils/prisma";
import type { PageWithTranslations } from "../types";
import { getBestTranslation } from "../utils/getBestTranslation";

export async function fetchPageWithPageSegments(pageId: number) {
	const pageWithSourceTexts = await prisma.page.findFirst({
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

	if (!pageWithSourceTexts) return null;
	const title = pageWithSourceTexts.pageSegments.filter(
		(item) => item.number === 0,
	)[0].text;

	return {
		...pageWithSourceTexts,
		title,
	};
}

export async function fetchPageWithTranslations(
	slug: string,
	locale: string,
	currentUserId?: number,
): Promise<PageWithTranslations | null> {
	const page = await prisma.page.findFirst({
		where: { slug },
		include: {
			user: true,
			pageSegments: {
				include: {
					pageSegmentTranslations: {
						where: { locale, isArchived: false },
						include: {
							user: true,
							votes: {
								where: currentUserId
									? { userId: currentUserId }
									: { userId: -1 },
							},
						},
						orderBy: [{ point: "desc" }, { createdAt: "desc" }],
					},
				},
			},
			tagPages: {
				include: {
					tag: true,
				},
			},
		},
	});

	if (!page) return null;

	const titleText = await prisma.pageSegment.findFirst({
		where: {
			pageId: page.id,
			number: 0,
		},
		include: {
			pageSegmentTranslations: {
				where: { isArchived: false },
				select: { locale: true },
			},
		},
	});

	const existLocales = titleText
		? Array.from(
				new Set(titleText.pageSegmentTranslations.map((t) => t.locale)),
			)
		: [];
	const { user, ...pageWithoutUser } = page;
	return {
		page: {
			...pageWithoutUser,
			createdAt: page.createdAt.toLocaleString(locale),
		},
		user,
		tagPages: page.tagPages,
		pageSegmentWithTranslations: page.pageSegments.map((pageSegment) => {
			const pageSegmentTranslationsWithVotes =
				pageSegment.pageSegmentTranslations.map((pageSegmentTranslation) => ({
					pageSegmentTranslation: {
						...pageSegmentTranslation,
						user: pageSegmentTranslation.user,
					},
					vote: pageSegmentTranslation.votes[0] || null,
				}));

			const bestPageSegmentTranslationWithVote = getBestTranslation(
				pageSegmentTranslationsWithVotes,
			);

			return {
				pageSegment,
				pageSegmentTranslationsWithVotes,
				bestPageSegmentTranslationWithVote,
			};
		}),
		existLocales,
	};
}

export async function fetchLatestUserAITranslationInfo(
	pageId: number,
	userId: number,
	locale: string,
) {
	return await prisma.userAITranslationInfo.findFirst({
		where: { pageId, userId, locale },
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
	userId?: number,
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

export async function fetchPageCommentsWithUser(
	pageId: number,
	locale: string,
) {
	const pageComments = await prisma.pageComment.findMany({
		where: {
			pageId,
		},
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	return pageComments.map((pageComment) => ({
		...pageComment,
		createdAt: pageComment.createdAt.toLocaleString(locale),
		updatedAt: pageComment.updatedAt.toLocaleString(locale),
	}));
}

export type PageCommentWithUser = Awaited<
	ReturnType<typeof fetchPageCommentsWithUser>
>;

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
	return pageWithComments;
}
