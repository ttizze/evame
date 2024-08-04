import { prisma } from "../../../utils/prisma";
import type { LatestPageVersionWithTranslations } from "../types";

export async function fetchLatestPageVersionWithTranslations(
	url: string,
	userId: number | null,
	targetLanguage: string,
): Promise<LatestPageVersionWithTranslations | null> {
	const pageVersion = await prisma.pageVersion.findFirst({
		where: { url },
		orderBy: { createdAt: "desc" },
		select: {
			title: true,
			url: true,
			content: true,
			license: true,
			pageVersionSourceTexts: {
				select: {
					sourceText: {
						select: {
							id: true,
							number: true,
							translateTexts: {
								where: { targetLanguage },
								select: {
									id: true,
									text: true,
									point: true,
									user: { select: { name: true } },
									votes: {
										where: userId ? { userId } : undefined,
										select: {
											id: true,
											isUpvote: true,
											updatedAt: true,
										},
										orderBy: { updatedAt: "desc" },
										take: 1,
									},
								},
								orderBy: [{ point: "desc" }, { createdAt: "desc" }],
							},
						},
					},
				},
				orderBy: {
					sourceText: {
						number: "asc",
					},
				},
			},
		},
	});

	if (!pageVersion) return null;

	return {
		title: pageVersion.title,
		url: pageVersion.url,
		license: pageVersion.license,
		content: pageVersion.content,
		sourceTextWithTranslations: pageVersion.pageVersionSourceTexts.map(
			({ sourceText }) => ({
				number: sourceText.number,
				sourceTextId: sourceText.id,
				translationsWithVotes: sourceText.translateTexts.map(
					(translateText) => ({
						id: translateText.id,
						text: translateText.text,
						point: translateText.point,
						userName: translateText.user.name,
						userVote: translateText.votes[0] || null,
					}),
				),
			}),
		),
		userId,
	};
}



export async function getLastReadDataNumber(
	userId: number,
	pageVersionId: number,
) {
	const readHistory = await prisma.userReadHistory.findUnique({
		where: {
			userId_pageVersionId: {
				userId: userId,
				pageVersionId: pageVersionId,
			},
		},
		select: {
			lastReadDataNumber: true,
		},
	});

	return readHistory?.lastReadDataNumber ?? 0;
}
