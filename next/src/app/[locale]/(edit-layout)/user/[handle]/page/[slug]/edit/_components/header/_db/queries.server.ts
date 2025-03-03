import { prisma } from "@/lib/prisma";

export async function hasExistingTranslation(
	pageId: number,
	locale: string,
): Promise<boolean> {
	const titlePageSegment = await prisma.pageSegment.findFirst({
		where: {
			pageId,
			number: 0,
		},
		include: {
			pageSegmentTranslations: {
				where: {
					locale,
					isArchived: false,
				},
			},
		},
	});

	return titlePageSegment?.pageSegmentTranslations.length
		? titlePageSegment.pageSegmentTranslations.length > 0
		: false;
}
