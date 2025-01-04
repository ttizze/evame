import { prisma } from "~/utils/prisma";

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
				locale,
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
