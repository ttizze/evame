import { prisma } from "~/utils/prisma";

export async function hasExistingTranslation(
	pageId: number,
	locale: string,
): Promise<boolean> {
	const titleSourceText = await prisma.sourceText.findFirst({
		where: {
			pageId,
			number: 0,
		},
		include: {
			translateTexts: {
				where: {
					locale,
					isArchived: false,
				},
			},
		},
	});

	return titleSourceText?.translateTexts.length
		? titleSourceText.translateTexts.length > 0
		: false;
}
