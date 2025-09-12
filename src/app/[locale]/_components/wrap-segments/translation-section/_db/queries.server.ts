import { prisma } from "@/lib/prisma";

export async function findPageIdBySegmentTranslationId(
	segmentTranslationId: number,
): Promise<number> {
	const st = await prisma.segmentTranslation.findUnique({
		where: { id: segmentTranslationId },
		select: {
			segment: {
				select: {
					content: {
						select: { page: { select: { id: true } } },
					},
				},
			},
		},
	});
	const id = st?.segment?.content?.page?.id;
	if (!id) {
		throw new Error("Page not found");
	}
	return id;
}
