import { prisma } from "@/lib/prisma";
import { TranslationStatus } from "@prisma/client";

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

export async function createPageAITranslationInfo(
	pageId: number,
	locale: string,
) {
	try {
		const pageAITranslationInfo = await prisma.pageAITranslationInfo.create({
			data: {
				pageId,
				locale,
			},
		});
		return pageAITranslationInfo;
	} catch (error) {
		console.error("Error in createPageAITranslationInfo:", error);
		throw error;
	}
}
