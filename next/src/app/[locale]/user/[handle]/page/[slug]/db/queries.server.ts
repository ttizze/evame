import { prisma } from "@/lib/prisma";
import { getBestTranslation } from "../lib/get-best-translation";
import type { PageWithTranslations } from "../types";

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

export async function fetchPageWithTranslations(
	slug: string,
	locale: string,
	currentUserId?: string,
): Promise<PageWithTranslations | null> {
	const page = await prisma.page.findFirst({
		where: { slug },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					handle: true,
					image: true,
					createdAt: true,
					updatedAt: true,
					profile: true,
					totalPoints: true,
					isAI: true,
				},
			},
			pageSegments: {
				include: {
					pageSegmentTranslations: {
						where: { locale, isArchived: false },
						include: {
							user: {
								select: {
									id: true,
									name: true,
									handle: true,
									image: true,
									createdAt: true,
									updatedAt: true,
									profile: true,
									totalPoints: true,
									isAI: true,
								},
							},
							votes: {
								where: currentUserId
									? { userId: currentUserId }
									: { userId: "0" },
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
		segmentWithTranslations: page.pageSegments.map((segment) => {
			const segmentTranslationsWithVotes = segment.pageSegmentTranslations.map(
				(segmentTranslation) => ({
					segmentTranslation: {
						...segmentTranslation,
						user: segmentTranslation.user,
					},
					translationVote:
						segmentTranslation.votes && segmentTranslation.votes.length > 0
							? {
									...segmentTranslation.votes[0],
									translationId: segmentTranslation.id,
								}
							: null,
				}),
			);

			const bestSegmentTranslationWithVote = getBestTranslation(
				segmentTranslationsWithVotes,
			);

			return {
				segment,
				segmentTranslationsWithVotes,
				bestSegmentTranslationWithVote,
			};
		}),
		existLocales,
	};
}

export async function fetchLatestUserAITranslationInfo(
	pageId: number,
	userId: string,
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
	return pageWithComments;
}
