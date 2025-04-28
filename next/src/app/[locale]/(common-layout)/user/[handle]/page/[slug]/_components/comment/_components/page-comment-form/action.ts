"use server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import { handlePageCommentAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNotificationPageComment } from "./_db/mutations.server";
import { processPageCommentHtml } from "./_lib/process-page-comment-html";
const createPageCommentSchema = z.object({
	pageId: z.coerce.number(),
	userLocale: z.string(),
	content: z.string().min(1, "Comment cannot be empty"),
	parentId: z.coerce.number().optional(),
	pageCommentId: z.coerce.number().optional(),
});

export type CommentActionResponse = ActionResponse<
	void,
	{
		pageId: number;
		userLocale: string;
		content: string;
		parentId?: number;
		pageCommentId?: number;
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
	const { content, pageId, parentId, userLocale, pageCommentId } = parsed.data;

	const page = await getPageById(pageId);
	if (!page) {
		return {
			success: false,
			message: "Page not found",
		};
	}

	const locale = await getLocaleFromHtml(content, userLocale);
	const pageComment = await processPageCommentHtml({
		pageCommentId: pageCommentId ?? undefined,
		commentHtml: content,
		locale,
		userId: currentUser.id,
		pageId,
		parentId,
	});
	await createNotificationPageComment(
		currentUser.id,
		page.userId,
		pageComment.id,
	);
	await handlePageCommentAutoTranslation({
		currentUserId: currentUser.id,
		pageCommentId: pageComment.id,
		pageId,
		sourceLocale: locale,
		geminiApiKey: process.env.GEMINI_API_KEY ?? "",
	});
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}`);
	return { success: true };
}
