import { prisma } from "~/utils/prisma";

export async function updateUserReadHistory(
	userId: number,
	pageId: number,
	lastReadDataNumber: number,
) {
	await prisma.userReadHistory.upsert({
		where: {
			userId_pageId: {
				userId: userId,
				pageId: pageId,
			},
		},
		update: {
			lastReadDataNumber: lastReadDataNumber,
			readAt: new Date(),
		},
		create: {
			userId: userId,
			pageId: pageId,
			lastReadDataNumber: lastReadDataNumber,
		},
	});
}

export async function createUserAITranslationInfo(
	userId: number,
	pageId: number,
	aiModel: string,
	locale: string,
) {
	try {
		const userAITranslationInfo = await prisma.userAITranslationInfo.create({
			data: {
				userId,
				pageId,
				targetLanguage: locale,
				aiModel,
				aiTranslationStatus: "pending",
				aiTranslationProgress: 0,
			},
		});
		return userAITranslationInfo;
	} catch (error) {
		console.error("Error in createUserAITranslationInfo:", error);
		throw error;
	}
}
