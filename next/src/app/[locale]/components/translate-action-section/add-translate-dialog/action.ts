"use server";
import { fetchGeminiApiKeyByHandle } from "@/app/db/queries.server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { getTranslateUserQueue } from "@/features/translate/translate-user-queue";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TranslateTarget } from "../../../(common-layout)/user/[handle]/page/[slug]/constants";
import { createUserAITranslationInfo } from "../../../(common-layout)/user/[handle]/page/[slug]/db/mutations.server";
import { fetchPageWithPageSegments } from "../../../(common-layout)/user/[handle]/page/[slug]/db/queries.server";
import { fetchPageWithTitleAndComments } from "../../../(common-layout)/user/[handle]/page/[slug]/db/queries.server";
const translateSchema = z.object({
	pageId: z.coerce.number(),
	aiModel: z.string().min(1, "モデルを選択してください"),
	locale: z.string().min(1, "localeを選択してください"),
	translateTarget: z.enum([
		TranslateTarget.TRANSLATE_PAGE,
		TranslateTarget.TRANSLATE_COMMENT,
	]),
});

export type TranslateActionState = ActionResponse<
	void,
	{
		pageId: number;
		aiModel: string;
		locale: string;
		translateTarget: string;
	}
>;

export async function TranslateAction(
	previousState: TranslateActionState,
	formData: FormData,
): Promise<TranslateActionState> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}

	const validate = translateSchema.safeParse({
		pageId: formData.get("pageId"),
		aiModel: formData.get("aiModel"),
		locale: formData.get("locale"),
		translateTarget: formData.get("translateTarget"),
	});
	if (!validate.success) {
		return {
			success: false,
			zodErrors: validate.error.flatten().fieldErrors,
		};
	}
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentUser.handle);
	if (!geminiApiKey) {
		return {
			success: false,
			message: "Gemini API key not found",
		};
	}

	if (validate.data.translateTarget === TranslateTarget.TRANSLATE_COMMENT) {
		const pageWithComments = await fetchPageWithTitleAndComments(
			validate.data.pageId,
		);
		if (!pageWithComments) {
			return { success: false, message: "Page not found" };
		}
		const comments = pageWithComments.pageComments.map((comment) => {
			const segments = comment.pageCommentSegments.map((segment) => ({
				number: segment.number,
				text: segment.text,
			}));
			//titleを追加しておく
			segments.push({
				number: 0,
				text: pageWithComments.pageSegments[0].text,
			});

			return {
				commentId: comment.id,
				segments,
			};
		});
		const userAITranslationInfo = await createUserAITranslationInfo(
			currentUser.id,
			pageWithComments.id,
			validate.data.aiModel,
			validate.data.locale,
		);

		for (const comment of comments) {
			const queue = getTranslateUserQueue(currentUser.id);
			await queue.add(`translate-${currentUser.id}`, {
				userAITranslationInfoId: userAITranslationInfo.id,
				geminiApiKey: geminiApiKey.apiKey,
				aiModel: validate.data.aiModel,
				userId: currentUser.id,
				pageId: pageWithComments.id,
				locale: validate.data.locale,
				title: pageWithComments.pageSegments[0].text,
				numberedElements: comment.segments,
				translateTarget: validate.data.translateTarget,
				commentId: comment.commentId,
			});
		}
	} else {
		const pageWithPageSegments = await fetchPageWithPageSegments(
			validate.data.pageId,
		);
		if (!pageWithPageSegments) {
			return {
				success: false,
				message: "Page not found",
			};
		}

		const numberedElements = pageWithPageSegments.pageSegments.map((item) => ({
			number: item.number,
			text: item.text,
		}));
		const userAITranslationInfo = await createUserAITranslationInfo(
			currentUser.id,
			pageWithPageSegments.id,
			validate.data.aiModel,
			validate.data.locale,
		);

		const queue = getTranslateUserQueue(currentUser.id);
		await queue.add(`translate-${currentUser.id}`, {
			userAITranslationInfoId: userAITranslationInfo.id,
			geminiApiKey: geminiApiKey.apiKey,
			aiModel: validate.data.aiModel,
			userId: currentUser.id,
			pageId: pageWithPageSegments.id,
			locale: validate.data.locale,
			title: pageWithPageSegments.title,
			numberedElements: numberedElements,
			translateTarget: validate.data.translateTarget,
		});
	}
	revalidatePath(`/user/${currentUser.handle}/page`);
	return {
		success: true,
	};
}
