import { getBestTranslation } from "@/app/[locale]/lib/get-best-translation";
import { prisma } from "@/lib/prisma";
import type { SegmentTranslationWithVote } from "../../../../types";

export async function fetchPageCommentsWithUserAndTranslations(
	pageId: number,
	locale: string,
	currentUserId?: string,
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
							pageCommentSegmentTranslationVotes: {
								where: currentUserId
									? { userId: currentUserId }
									: { userId: "0" },
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

export async function getPageCommentById(pageCommentId: number) {
	return await prisma.pageComment.findUnique({
		where: { id: pageCommentId },
	});
}
