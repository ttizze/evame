import { prisma } from "@/lib/prisma";

export async function getPageCommentById(pageCommentId: number) {
	return await prisma.pageComment.findUnique({
		where: { id: pageCommentId },
		select: { userId: true },
	});
}

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
		orderBy: { createdAt: "asc" },
	});

	// 日付をlocaleに合わせた文字列に変換して返す
	return flatComments.map((comment) => ({
		...comment,
		createdAt: comment.createdAt.toLocaleString(locale),
		updatedAt: comment.updatedAt.toLocaleString(locale),
	}));
}

export type PageCommentWithPageCommentSegments = NonNullable<
	Awaited<ReturnType<typeof fetchPageCommentsWithPageCommentSegments>>[number]
> & {
	replies?: PageCommentWithPageCommentSegments[];
};
export type PageCommentSegment =
	PageCommentWithPageCommentSegments["pageCommentSegments"][number];

export type PageCommentSegmentTranslation =
	PageCommentSegment["pageCommentSegmentTranslations"][number];

export type PageCommentSegmentTranslationVote =
	PageCommentSegmentTranslation["pageCommentSegmentTranslationVotes"][number];
