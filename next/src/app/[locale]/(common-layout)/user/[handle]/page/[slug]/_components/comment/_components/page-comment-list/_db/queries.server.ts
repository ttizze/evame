import { prisma } from "@/lib/prisma";
export async function fetchPageCommentsWithPageCommentSegments(
	pageId: number,
	locale: string,
	currentUserId?: string,
) {
	const flatComments = await prisma.pageComment.findMany({
		where: { pageId },
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
			pageCommentSegments: {
				select: {
					id: true,
					number: true,
					text: true,
					pageCommentSegmentTranslations: {
						where: { locale },
						include: {
							user: {
								select: {
									name: true,
									handle: true,
									image: true,
									createdAt: true,
									updatedAt: true,
									profile: true,
									twitterHandle: true,
									totalPoints: true,
									isAI: true,
								},
							},
							pageCommentSegmentTranslationVotes: {
								where: currentUserId ? { userId: currentUserId } : {},
							},
						},
						orderBy: [{ point: "desc" }, { createdAt: "desc" }],
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});

	return flatComments.map((comment) => ({
		...comment,
		createdAt: comment.createdAt.toISOString(),
		updatedAt: comment.updatedAt.toISOString(),
	}));
}

export type PageCommentWithPageCommentSegments = NonNullable<
	Awaited<ReturnType<typeof fetchPageCommentsWithPageCommentSegments>>[number]
> & {
	replies?: PageCommentWithPageCommentSegments[];
};
