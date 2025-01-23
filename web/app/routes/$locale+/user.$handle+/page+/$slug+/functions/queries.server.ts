import { prisma } from "~/utils/prisma";
import type { PageWithTranslations } from "../types";
import { getBestTranslation } from "../utils/getBestTranslation";

export async function fetchPageWithSourceTexts(pageId: number) {
	const pageWithSourceTexts = await prisma.page.findFirst({
		where: { id: pageId },
		select: {
			id: true,
			slug: true,
			content: true,
			createdAt: true,
			sourceTexts: {
				select: {
					id: true,
					number: true,
					text: true,
				},
			},
		},
	});

	if (!pageWithSourceTexts) return null;
	const title = pageWithSourceTexts.sourceTexts.filter(
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
			sourceTexts: {
				include: {
					translateTexts: {
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

	const titleText = await prisma.sourceText.findFirst({
		where: {
			pageId: page.id,
			number: 0,
		},
		include: {
			translateTexts: {
				where: { isArchived: false },
				select: { locale: true },
			},
		},
	});

	const existLocales = titleText
		? Array.from(new Set(titleText.translateTexts.map((t) => t.locale)))
		: [];
	const { user, ...pageWithoutUser } = page;
	return {
		page: {
			...pageWithoutUser,
			createdAt: page.createdAt.toLocaleString(locale),
		},
		user,
		tagPages: page.tagPages,
		sourceTextWithTranslations: page.sourceTexts.map((sourceText) => {
			const translationsWithVotes = sourceText.translateTexts.map(
				(translateText) => ({
					translateText: {
						...translateText,
						user: translateText.user,
					},
					vote: translateText.votes[0] || null,
				}),
			);

			const bestTranslationWithVote = getBestTranslation(translationsWithVotes);

			return {
				sourceText,
				translationsWithVotes,
				bestTranslationWithVote,
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

export async function fetchCommentsWithUser(pageId: number, locale: string) {
	const comments = await prisma.comment.findMany({
		where: {
			pageId,
		},
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					icon: true,
				},
			},
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	return comments.map((comment) => ({
		...comment,
		createdAt: comment.createdAt.toLocaleString(locale),
		updatedAt: comment.updatedAt.toLocaleString(locale),
	}));
}

export type CommentWithUser = Awaited<ReturnType<typeof fetchCommentsWithUser>>;
