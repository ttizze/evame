import { selectSegmentTranslations } from "@/app/[locale]/_db/queries.server";
import { normalizeSegments } from "@/app/[locale]/_lib/normalize-segments";
import { prisma } from "@/lib/prisma";

export async function fetchPageCommentsWithSegments(
	pageId: number,
	locale: string,
) {
	const comments = await prisma.pageComment.findMany({
		where: { pageId },
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
			content: {
				select: {
					segments: {
						select: {
							id: true,
							number: true,
							text: true,
							segmentTranslations:
								selectSegmentTranslations(locale).segmentTranslations,
						},
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});
	return comments.map((comment) => ({
		...comment,
		content: {
			segments: normalizeSegments(comment.content.segments),
		},
	}));
}

export type PageCommentWithSegments = NonNullable<
	Awaited<ReturnType<typeof fetchPageCommentsWithSegments>>[number]
> & {
	replies?: PageCommentWithSegments[];
};
