"use server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import { handleCommentAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNotificationPageComment } from "./_db/mutations.server";
import { createPageComment } from "./_db/mutations.server";
import { processPageCommentHtml } from "./_lib/process-page-comment-html";
const createPageCommentSchema = z.object({
	pageId: z.coerce.number(),
	content: z.string().min(1, "Comment cannot be empty"),
	parentId: z.coerce.number().optional(),
});

export type CommentActionResponse = ActionResponse<
	void,
	{
		pageId: number;
		content: string;
		parentId?: number;
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
	const parsed = await parseFormData(createPageCommentSchema, formData);
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors,
		};
	}
	const { content, pageId, parentId } = parsed.data;

	const page = await getPageById(pageId);
	if (!page) {
		return {
			success: false,
			message: "Page not found",
		};
	}

	const locale = await getLocaleFromHtml(content);
	const pageComment = await createPageComment(
		content,
		locale,
		currentUser.id,
		pageId,
		parentId,
	);
	await Promise.all([
		createNotificationPageComment(currentUser.id, page.userId, pageComment.id),
		processPageCommentHtml(
			pageComment.id,
			content,
			locale,
			currentUser.id,
			pageId,
		),
	]);
	handleCommentAutoTranslation({
		currentUserId: currentUser.id,
		commentId: pageComment.id,
		pageId,
		content,
		sourceLocale: locale,
		geminiApiKey: process.env.GEMINI_API_KEY ?? "",
	});
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}`);
	return { success: true };
}
