import { prisma } from "@/lib/prisma";

export async function findPageSlugAndHandleBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<{ slug: string; handle: string }> {
	const st = await prisma.segmentTranslation.findUnique({
		where: { id: segmentTranslationId },
		select: {
			segment: {
				select: {
					content: {
						select: {
							page: {
								select: {
									slug: true,
									user: { select: { handle: true } },
								},
							},
						},
					},
				},
			},
		},
	});

	const page = st?.segment?.content?.page;
	if (!page) {
		throw new Error("Page not found");
	}
	return { slug: page.slug, handle: page.user.handle };
}
