import { TranslationStatus } from "@prisma/client";
import { prisma } from "~/utils/prisma";
export async function createUserAITranslationInfo(
	userId: string,
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
				aiTranslationStatus: TranslationStatus.PENDING,
				aiTranslationProgress: 0,
			},
		});
		return userAITranslationInfo;
	} catch (error) {
		console.error("Error in createUserAITranslationInfo:", error);
		throw error;
	}
}
