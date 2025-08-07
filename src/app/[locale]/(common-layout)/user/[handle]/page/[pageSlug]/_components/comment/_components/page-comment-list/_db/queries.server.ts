import { selectUserFields } from "@/app/[locale]/_db/queries.server";
import { prisma } from "@/lib/prisma";

export async function fetchPageCommentsWithPageCommentSegments(
	pageId: number,
	locale: string,
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
						select: {
							id: true,
							locale: true,
							text: true,
							point: true,
							createdAt: true,
							user: {
								select: selectUserFields(),
							},
						},
						orderBy: [{ point: "desc" }, { createdAt: "desc" }],
						take: 1,
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
