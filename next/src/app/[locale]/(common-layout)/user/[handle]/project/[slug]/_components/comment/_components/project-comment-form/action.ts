"use server";
import { createActionFactory } from "@/app/[locale]/_action/create-action-factory";
import { getProjectById } from "@/app/[locale]/_db/project-queries.server";
import type { TranslationJobForToast } from "@/app/[locale]/_hooks/use-translation-jobs";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import { handleProjectCommentAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { createNotificationProjectComment } from "./_db/mutations.server";
import { processProjectCommentHtml } from "./_lib/process-project-comment-html";

/* 公開レスポンス型 */
export type CommentActionResponse = ActionResponse<
	{ translationJobs: TranslationJobForToast[] },
	{
		projectId: string;
		userLocale: string;
		content: string;
		parentId?: number;
		projectCommentId?: number;
	}
>;

/* Success 用データ型 ───────────── */
type CommentSuccessData = { translationJobs: TranslationJobForToast[] };

/* create が内部で使う型（公開しない） */
type CreateResult = CommentSuccessData & { revalidatePath: string };

/* 入力スキーマ */
const inputSchema = z.object({
	projectId: z.coerce.number().min(1),
	userLocale: z.string(),
	content: z.string().min(1, "Comment cannot be empty"),
	parentId: z.coerce.number().optional(),
	projectCommentId: z.coerce.number().optional(),
});

export const commentAction = createActionFactory<
	typeof inputSchema, // 1) スキーマ
	CreateResult, // 2) 成功データ(内部)
	CommentSuccessData // 3) 公開データ(外部)
>({
	inputSchema,

	async create(input, userId) {
		const project = await getProjectById(input.projectId);
		if (!project) return { success: false, message: "Project not found" };

		const locale = await getLocaleFromHtml(input.content, input.userLocale);

		const pc = await processProjectCommentHtml({
			projectCommentId: input.projectCommentId,
			commentHtml: input.content,
			locale,
			userId,
			projectId: input.projectId,
			parentId: input.parentId,
		});

		await createNotificationProjectComment(userId, project.userId, pc.id);

		const translationJobs = await handleProjectCommentAutoTranslation({
			currentUserId: userId,
			projectCommentId: pc.id,
			projectId: input.projectId,
			sourceLocale: locale,
			geminiApiKey: process.env.GEMINI_API_KEY ?? "",
		});

		return {
			success: true,
			data: {
				translationJobs,
				revalidatePath: `/user/${project.user.handle}/project/${project.id}`,
			},
		};
	},

	buildRevalidatePaths: (_i, _h, d) => [d.revalidatePath],

	buildResponse: (d) => ({
		success: true,
		data: { translationJobs: d.translationJobs },
	}),
});
