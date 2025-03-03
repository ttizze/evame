"use server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
	createNotificationPageComment,
	createPageComment,
} from "../../_db/mutations.server";
import { processPageCommentHtml } from "../../_lib/process-page-comment-html";
const createPageCommentSchema = z.object({
	pageId: z.coerce.number(),
	content: z.string().min(1, "Comment cannot be empty"),
});

export type CommentActionResponse = ActionResponse<
	void,
	{
		pageId: number;
		content: string;
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
	const parsed = createPageCommentSchema.safeParse({
		pageId: formData.get("pageId"),
		content: formData.get("content"),
	});
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors,
		};
	}
	const { content, pageId } = parsed.data;

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
	);
	await createNotificationPageComment(
		currentUser.id,
		page.userId,
		pageComment.id,
	);
	await processPageCommentHtml(
		pageComment.id,
		content,
		locale,
		currentUser.id,
		pageId,
	);
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}`);
	return { success: true };
}
