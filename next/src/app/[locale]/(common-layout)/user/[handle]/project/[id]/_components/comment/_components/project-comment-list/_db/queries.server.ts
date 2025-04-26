import { prisma } from "@/lib/prisma";

export async function fetchProjectCommentsWithProjectCommentSegments(
	projectId: string,
	locale: string,
	currentUserId?: string,
) {
	const flatComments = await prisma.projectComment.findMany({
		where: { projectId },
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
			projectCommentSegments: {
				select: {
					id: true,
					number: true,
					text: true,
					projectCommentSegmentTranslations: {
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
							projectCommentSegmentTranslationVotes: {
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

export type ProjectCommentWithProjectCommentSegments = NonNullable<
	Awaited<
		ReturnType<typeof fetchProjectCommentsWithProjectCommentSegments>
	>[number]
> & {
	replies?: ProjectCommentWithProjectCommentSegments[];
};
