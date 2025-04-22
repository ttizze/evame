"use server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { detectLocale } from "@/app/[locale]/_lib/detect-locale";
import { handleCommentAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createNotificationPageComment } from "./_db/mutations.server";
import {
	createPageComment,
	upsertPageCommentAndSegments,
} from "./_db/mutations.server";
const createPageCommentSchema = z.object({
	pageId: z.coerce.number(),
	userLocale: z.string(),
	contentJson: z
		.string()
		.min(1)
		.transform((str) => JSON.parse(str)),
	parentId: z.coerce.number().optional(),
});

export type CommentActionResponse = ActionResponse<
	void,
	{
		pageId: number;
		userLocale: string;
		contentJson: string;
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
	const { contentJson, pageId, parentId, userLocale } = parsed.data;

	const page = await getPageById(pageId);
	if (!page) {
		return {
			success: false,
			message: "Page not found",
		};
	}

	const sourceLocale = await detectLocale(contentJson, userLocale);
	const pageComment = await createPageComment({
		contentJson,
		sourceLocale,
		pageId,
		userId: currentUser.id,
		parentId,
	});
	/* 4. 本文 & セグメントをアップサート */
	await upsertPageCommentAndSegments({
		pageId,
		commentId: pageComment.id,
		userId: currentUser.id,
		contentJson,
		sourceLocale,
	});

	await Promise.all([
		createNotificationPageComment(currentUser.id, page.userId, pageComment.id),
	]);
	handleCommentAutoTranslation({
		currentUserId: currentUser.id,
		commentId: pageComment.id,
		pageId,
		sourceLocale,
		geminiApiKey: process.env.GEMINI_API_KEY ?? "",
	});
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}`);
	return { success: true };
}
