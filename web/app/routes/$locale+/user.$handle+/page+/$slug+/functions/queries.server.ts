import { prisma } from "~/utils/prisma";
import type {
	PageWithTranslations,
	SegmentTranslationWithVote,
} from "../types";
import { getBestTranslation } from "../utils/getBestTranslation";

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

export async function fetchPageCommentsWithUserAndTranslations(
	pageId: number,
	locale: string,
	currentUserId?: number,
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
			pageCommentSegments: {
				include: {
					pageCommentSegmentTranslations: {
						where: { locale },
						include: {
							user: true,
							pageCommentSegmentTranslationVotes: {
								where: currentUserId
									? { userId: currentUserId }
									: { userId: -1 },
							},
						},
						orderBy: [{ point: "desc" }, { createdAt: "desc" }],
					},
				},
			},
		},
		orderBy: {
			createdAt: "asc",
		},
	});
	console.log(
		pageComments[0].pageCommentSegments[0].pageCommentSegmentTranslations[0]
			.pageCommentSegmentTranslationVotes,
	);

	return pageComments.map((comment) => {
		const pageCommentSegmentsWithTranslations = comment.pageCommentSegments.map(
			(segment) => {
				// SegmentTranslationWithVote[] を作る
				const segmentTranslationsWithVotes: SegmentTranslationWithVote[] =
					segment.pageCommentSegmentTranslations.map((translation) => {
						return {
							segmentTranslation: {
								...translation,
								user: translation.user,
							},
							translationVote:
								translation.pageCommentSegmentTranslationVotes &&
								translation.pageCommentSegmentTranslationVotes.length > 0
									? {
											...translation.pageCommentSegmentTranslationVotes[0],
											translationId: translation.id,
										}
									: null,
						};
					});

				// ベスト翻訳（point 順等で先頭にある翻訳と仮定）
				const bestSegmentTranslationWithVote = getBestTranslation(
					segmentTranslationsWithVotes,
				);

				return {
					segment,
					segmentTranslationsWithVotes,
					bestSegmentTranslationWithVote,
				};
			},
		);

		return {
			...comment,
			createdAt: comment.createdAt.toLocaleString(locale),
			updatedAt: comment.updatedAt.toLocaleString(locale),
			pageCommentSegmentsWithTranslations,
		};
	});
}

export type PageCommentWithUser = Awaited<
	ReturnType<typeof fetchPageCommentsWithUserAndTranslations>
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
