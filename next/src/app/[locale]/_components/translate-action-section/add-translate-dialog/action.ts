"use server";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { BASE_URL } from "@/app/_constants/base-url";
import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import type { TranslateJobParams } from "@/features/translate/types";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fetchPageWithPageSegments } from "../../../(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import { fetchPageWithTitleAndComments } from "../../../(common-layout)/user/[handle]/page/[slug]/_db/queries.server";
import type { TargetContentType } from "../../../(common-layout)/user/[handle]/page/[slug]/constants";
// バリデーション用のスキーマ
const translateSchema = z.object({
	pageId: z.coerce.number(),
	aiModel: z.string().min(1, "モデルを選択してください"),
	targetLocale: z.string().min(1, "localeを選択してください"),
	targetContentType: z.enum(["page", "comment", "project"]),
});

export type TranslateActionState = ActionResponse<
	void,
	{
		pageId: number;
		aiModel: string;
		targetLocale: string;
		targetContentType: TargetContentType;
	}
>;

export async function translateAction(
	previousState: TranslateActionState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	const parsedFormData = await parseFormData(translateSchema, formData);
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { pageId, aiModel, targetLocale, targetContentType } =
		parsedFormData.data;
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentUser.handle);
	if (!geminiApiKey) {
		return {
			success: false,
			message: "Gemini API key not found",
		};
	}

	if (targetContentType === "comment") {
		const pageWithTitleAndComments =
			await fetchPageWithTitleAndComments(pageId);
		if (!pageWithTitleAndComments) {
			return { success: false, message: "Page not found" };
		}
		const comments = pageWithTitleAndComments.pageComments.map((comment) => {
			const segments = comment.pageCommentSegments.map((segment) => ({
				number: segment.number,
				text: segment.text,
			}));
			// title を追加
			segments.push({
				number: 0,
				text: pageWithTitleAndComments.title,
			});

			return {
				commentId: comment.id,
				segments,
			};
		});
		const translationJob = await createTranslationJob({
			userId: currentUser.id,
			pageId: pageWithTitleAndComments.id,
			aiModel,
			locale: targetLocale,
		});

		for (const comment of comments) {
			const jobParams: TranslateJobParams = {
				translationJobId: translationJob.id,
				geminiApiKey: geminiApiKey.apiKey,
				aiModel,
				userId: currentUser.id,
				pageId: pageWithTitleAndComments.id,
				targetLocale,
				title: pageWithTitleAndComments.title,
				numberedElements: comment.segments,
				targetContentType,
				commentId: comment.commentId,
			};
			await fetch(`${BASE_URL}/api/translate`, {
				method: "POST",
				body: JSON.stringify(jobParams),
			});
		}
	} else {
		const pageWithPageSegments = await fetchPageWithPageSegments(pageId);
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
		const translationJob = await createTranslationJob({
			userId: currentUser.id,
			pageId: pageWithPageSegments.id,
			aiModel,
			locale: targetLocale,
		});

		const jobParams: TranslateJobParams = {
			translationJobId: translationJob.id,
			geminiApiKey: geminiApiKey.apiKey,
			aiModel,
			userId: currentUser.id,
			pageId: pageWithPageSegments.id,
			targetLocale,
			title: pageWithPageSegments.title,
			numberedElements,
			targetContentType,
		};
		await fetch(`${BASE_URL}/api/translate`, {
			method: "POST",
			body: JSON.stringify(jobParams),
		});
	}

	revalidatePath(`/user/${currentUser.handle}/page`);
	return {
		success: true,
	};
}
