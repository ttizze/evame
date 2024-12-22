import { prisma } from "~/utils/prisma";

export async function createUserAITranslationInfo(
	userId: number,
	pageId: number,
	aiModel: string,
	targetLanguage: string,
) {
	try {
		const userAITranslationInfo = await prisma.userAITranslationInfo.create({
			data: {
				userId,
				pageId,
				aiModel,
				targetLanguage,
				aiTranslationStatus: "pending",
				aiTranslationProgress: 0,
			},
		});
		return userAITranslationInfo;
	} catch (error) {
		console.error("Error in getOrCreateUserAITranslationInfo:", error);
		throw error;
	}
}

export async function archivePages(pageIds: number[]) {
	return prisma.page.updateMany({
		where: { id: { in: pageIds } },
		data: {
			isArchived: true,
		},
	});
}

export async function togglePagePublicStatus(pageId: number) {
	const page = await prisma.page.findUnique({ where: { id: pageId } });
	if (!page) {
		throw new Error("Page not found");
	}
	return prisma.page.update({
		where: { id: pageId },
		data: {
			isPublished: !page.isPublished,
		},
	});
}
