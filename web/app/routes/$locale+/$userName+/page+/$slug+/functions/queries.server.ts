import { prisma } from "~/utils/prisma";
import { sanitizeUser } from "~/utils/sanitizeUser";
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
	currentUserId: number | null,
	locale: string,
): Promise<PageWithTranslations | null> {
	const page = await prisma.page.findFirst({
		where: { slug },
		include: {
			user: true,
			sourceTexts: {
				include: {
					translateTexts: {
						where: { targetLanguage: locale, isArchived: false },
						include: {
							user: true,
							votes: {
								where: currentUserId ? { userId: currentUserId } : undefined,
								orderBy: { updatedAt: "desc" },
								take: 1,
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

	return {
		page: {
			...page,
			createdAt: page.createdAt.toLocaleString(locale),
		},
		user: sanitizeUser(page.user),
		tagPages: page.tagPages,
		sourceTextWithTranslations: page.sourceTexts.map((sourceText) => {
			const translationsWithVotes = sourceText.translateTexts.map(
				(translateText) => ({
					translateText,
					user: sanitizeUser(translateText.user),
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
	};
}

export async function getLastReadDataNumber(userId: number, pageId: number) {
	const readHistory = await prisma.userReadHistory.findUnique({
		where: {
			userId_pageId: {
				userId: userId,
				pageId: pageId,
			},
		},
		select: {
			lastReadDataNumber: true,
		},
	});

	return readHistory?.lastReadDataNumber ?? 0;
}

export async function fetchLatestUserAITranslationInfo(
	pageId: number,
	userId: number,
	locale: string,
) {
	return await prisma.userAITranslationInfo.findFirst({
		where: { pageId, userId, targetLanguage: locale },
		orderBy: { createdAt: "desc" },
	});
}

export async function fetchLikeCount(pageId: number) {
	const likeCount = await prisma.likePage.count({
		where: { pageId },
	});
	return likeCount;
}
export async function fetchIsLikedByUser(pageId: number, userId: number) {
	const like = await prisma.likePage.findFirst({
		where: { pageId, userId },
	});
	return !!like;
}
