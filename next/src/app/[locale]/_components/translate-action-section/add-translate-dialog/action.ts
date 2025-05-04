"use server";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { createTranslationJob } from "@/app/[locale]/_db/mutations.server";
import { fetchPageIdBySlug } from "@/app/[locale]/_db/page-queries.server";
import { fetchPageWithPageSegments } from "@/app/[locale]/_db/page-queries.server";
import { fetchPageWithTitleAndComments } from "@/app/[locale]/_db/page-queries.server";
import {
	fetchProjectIdBySlug,
	fetchProjectWithProjectSegments,
	fetchProjectWithTitleAndComments,
} from "@/app/[locale]/_db/project-queries.server";
import { BASE_URL } from "@/app/_constants/base-url";
import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import type { TranslateJobParams } from "@/features/translate/types";
import type { TranslationJob } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TargetContentType } from "../../../(common-layout)/user/[handle]/page/[pageSlug]/constants";
import { targetContentTypeValues } from "../../../(common-layout)/user/[handle]/page/[pageSlug]/constants";
// バリデーション用のスキーマ
const translateSchema = z.object({
	pageSlug: z.string().optional(),
	projectSlug: z.string().optional(),
	aiModel: z.string().min(1, "モデルを選択してください"),
	targetLocale: z.string().min(1, "localeを選択してください"),
	targetContentType: z.enum(targetContentTypeValues),
});

export type TranslateActionState = ActionResponse<
	{
		translationJobs: TranslationJob[];
	},
	{
		pageSlug: string;
		projectSlug: string;
		aiModel: string;
		targetLocale: string;
		targetContentType: TargetContentType;
	}
>;

export async function translateAction(
	previousState: TranslateActionState,
	formData: FormData,
): Promise<TranslateActionState> {
	const v = await authAndValidate(translateSchema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = v;
	const { pageSlug, projectSlug, aiModel, targetLocale, targetContentType } =
		data;
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentUser.handle);
	if (!geminiApiKey) {
		return {
			success: false,
			message: "Gemini API key not found",
		};
	}
	const translationJobs: TranslationJob[] = [];

	if (pageSlug) {
		const page = await fetchPageIdBySlug(pageSlug);
		if (!page) {
			return { success: false, message: "Page not found" };
		}
		const pageWithPageSegments = await fetchPageWithPageSegments(page.id);
		if (pageWithPageSegments) {
			const numberedElements = pageWithPageSegments.pageSegments.map(
				(item) => ({
					number: item.number,
					text: item.text,
				}),
			);
			const translationJob = await createTranslationJob({
				userId: currentUser.id,
				pageId: pageWithPageSegments.id,
				aiModel,
				locale: targetLocale,
			});
			translationJobs.push(translationJob);
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
		const pageWithTitleAndComments = await fetchPageWithTitleAndComments(
			page.id,
		);
		if (pageWithTitleAndComments) {
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
					targetContentType: "pageComment",
					pageCommentId: comment.commentId,
				};
				await fetch(`${BASE_URL}/api/translate`, {
					method: "POST",
					body: JSON.stringify(jobParams),
				});
			}
		}
	}
	if (projectSlug) {
		const project = await fetchProjectIdBySlug(projectSlug);
		if (!project) {
			return { success: false, message: "Project not found" };
		}
		const projectWithProjectSegments = await fetchProjectWithProjectSegments(
			project.id,
		);
		if (projectWithProjectSegments) {
			const numberedElements = projectWithProjectSegments.projectSegments.map(
				(item) => ({
					number: item.number,
					text: item.text,
				}),
			);
			const translationJob = await createTranslationJob({
				userId: currentUser.id,
				projectId: projectWithProjectSegments.id,
				aiModel,
				locale: targetLocale,
			});
			translationJobs.push(translationJob);
			const jobParams: TranslateJobParams = {
				translationJobId: translationJob.id,
				geminiApiKey: geminiApiKey.apiKey,
				aiModel,
				userId: currentUser.id,
				projectId: projectWithProjectSegments.id,
				targetLocale,
				title: projectWithProjectSegments.title,
				numberedElements,
				targetContentType,
			};
			await fetch(`${BASE_URL}/api/translate`, {
				method: "POST",
				body: JSON.stringify(jobParams),
			});
		}
		const projectWithTitleAndComments = await fetchProjectWithTitleAndComments(
			project.id,
		);
		if (projectWithTitleAndComments) {
			const comments = projectWithTitleAndComments.projectComments.map(
				(comment) => {
					const segments = comment.projectCommentSegments.map((segment) => ({
						number: segment.number,
						text: segment.text,
					}));
					// title を追加
					segments.push({
						number: 0,
						text: projectWithTitleAndComments.title,
					});

					return {
						commentId: comment.id,
						segments,
					};
				},
			);
			const translationJob = await createTranslationJob({
				userId: currentUser.id,
				projectId: projectWithTitleAndComments.id,
				aiModel,
				locale: targetLocale,
			});
			for (const comment of comments) {
				const jobParams: TranslateJobParams = {
					translationJobId: translationJob.id,
					geminiApiKey: geminiApiKey.apiKey,
					aiModel,
					userId: currentUser.id,
					projectId: projectWithTitleAndComments.id,
					targetLocale,
					title: projectWithTitleAndComments.title,
					numberedElements: comment.segments,
					targetContentType: "projectComment",
					projectCommentId: comment.commentId,
				};
				await fetch(`${BASE_URL}/api/translate`, {
					method: "POST",
					body: JSON.stringify(jobParams),
				});
			}
		}
	}

	revalidatePath(`/user/${currentUser.handle}/page`);
	return {
		success: true,
		data: {
			translationJobs,
		},
	};
}
