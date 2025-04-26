"use server";
import { getProjectById } from "@/app/[locale]/_db/project-queries.server";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import { handleProjectCommentAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNotificationProjectComment } from "./_db/mutations.server";
import { processProjectCommentHtml } from "./_lib/process-project-comment-html";

const createProjectCommentSchema = z.object({
	projectId: z.string().min(1),
	userLocale: z.string(),
	content: z.string().min(1, "Comment cannot be empty"),
	parentId: z.number().optional(),
	projectCommentId: z.number().optional(),
});

export type CommentActionResponse = ActionResponse<
	void,
	{
		projectId: string;
		userLocale: string;
		content: string;
		parentId?: number;
		projectCommentId?: number;
	}
>;

export async function commentAction(
	previousState: CommentActionResponse,
	formData: FormData,
): Promise<CommentActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	const parsed = await parseFormData(createProjectCommentSchema, formData);
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors,
		};
	}
	const { content, projectId, parentId, userLocale, projectCommentId } =
		parsed.data;

	const project = await getProjectById(projectId);
	if (!project) {
		return {
			success: false,
			message: "Project not found",
		};
	}

	const locale = await getLocaleFromHtml(content, userLocale);
	const projectComment = await processProjectCommentHtml({
		projectCommentId: projectCommentId ?? undefined,
		commentHtml: content,
		locale,
		userId: currentUser.id,
		projectId,
		parentId,
	});

	await createNotificationProjectComment(
		currentUser.id,
		project.userId,
		projectComment.id,
	);

	await handleProjectCommentAutoTranslation({
		currentUserId: currentUser.id,
		commentId: projectComment.id,
		projectId,
		sourceLocale: locale,
		geminiApiKey: process.env.GEMINI_API_KEY ?? "",
	});

	revalidatePath(`/user/${project.user.handle}/project/${project.id}`);
	return { success: true };
}
