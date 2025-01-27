import type { TranslationStatus } from "@prisma/client";
// ioLogic.ts
import { prisma } from "../../../utils/prisma";
import {
	getOrCreateAIUser,
	updateUserAITranslationInfo,
} from "../functions/mutations.server";
import {
	getLatestPageCommentSegments,
	getLatestPageSegments,
} from "../functions/query.server";
import { getGeminiModelResponse } from "../services/gemini";
import type { NumberedElement } from "../types";

export const pageDeps = {
	async getLatestPageSegments(pageId: number) {
		return getLatestPageSegments(pageId);
	},

	async saveTranslationsForPage(
		extractedTranslations: NumberedElement[],
		pageSegments: { id: number; number: number }[],
		locale: string,
		aiModel: string,
	) {
		const systemUserId = await getOrCreateAIUser(aiModel);

		const translationData = extractedTranslations
			.map((translation) => {
				const pageSegmentId = pageSegments.find(
					(pageSegment) => pageSegment.number === translation.number,
				)?.id;
				if (!pageSegmentId) {
					console.error(
						`Source text ID not found for translation number ${translation.number} ${translation.text}`,
					);
					return null;
				}
				return {
					locale,
					text: translation.text,
					pageSegmentId,
					userId: systemUserId,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);

		if (translationData.length > 0) {
			await prisma.pageSegmentTranslation.createMany({
				data: translationData,
			});
		}
	},
};

export const commentDeps = {
	async getLatestPageCommentSegments(pageId: number) {
		return getLatestPageCommentSegments(pageId);
	},

	async saveTranslationsForComment(
		extractedTranslations: NumberedElement[],
		pageCommentSegments: { id: number; number: number }[],
		locale: string,
		aiModel: string,
	) {
		const systemUserId = await getOrCreateAIUser(aiModel);

		const translationData = extractedTranslations
			.map((translation) => {
				const pageCommentSegmentId = pageCommentSegments.find(
					(pageCommentSegment) =>
						pageCommentSegment.number === translation.number,
				)?.id;
				if (!pageCommentSegmentId) {
					console.error(
						`Page comment segment ID not found for translation number ${translation.number} ${translation.text}`,
					);
					return null;
				}
				return {
					locale,
					text: translation.text,
					pageCommentSegmentId,
					userId: systemUserId,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null);

		if (translationData.length > 0) {
			await prisma.pageCommentSegmentTranslation.createMany({
				data: translationData,
			});
		}
	},
};

export const commonDeps = {
	async updateUserAITranslationInfo(
		userAITranslationInfoId: number,
		status: TranslationStatus,
		progress: number,
	) {
		await updateUserAITranslationInfo(
			userAITranslationInfoId,
			status,
			progress,
		);
	},

	async getTranslatedText(
		geminiApiKey: string,
		aiModel: string,
		numberedElements: NumberedElement[],
		locale: string,
		title: string,
	) {
		const source_text = numberedElements
			.map((el) => JSON.stringify(el))
			.join("\n");
		return getGeminiModelResponse(
			geminiApiKey,
			aiModel,
			title,
			source_text,
			locale,
		);
	},
};
