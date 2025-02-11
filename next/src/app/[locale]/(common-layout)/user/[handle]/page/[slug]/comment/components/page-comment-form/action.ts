"use server";
import { getLocaleFromHtml } from "@/app/[locale]/lib/get-locale-from-html";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPageComment } from "../../db/mutations.server";
import { processPageCommentHtml } from "../../lib/process-page-comment-html";
import { redirect } from "next/navigation";

const createPageCommentSchema = z.object({
	pageId: z.coerce.number(),
	content: z.string().min(1, "Comment cannot be empty"),
});

export type CommentActionResponse = ActionResponse<void, {
	pageId: number;
	content: string;
}>;

export async function commentAction(
	previousState: CommentActionResponse,
	formData: FormData,
): Promise<CommentActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const validate = createPageCommentSchema.safeParse({
		pageId: formData.get("pageId"),
		content: formData.get("content"),
	});
	if (!validate.success) {
		return {
			success: false,
			zodErrors: validate.error.flatten().fieldErrors,
		};
	}

	const locale = await getLocaleFromHtml(validate.data.content);
	const pageComment = await createPageComment(
		validate.data.content,
		locale,
		currentUser.id,
		validate.data.pageId,
	);
	await processPageCommentHtml(
		pageComment.id,
		validate.data.content,
		locale,
		currentUser.id,
		validate.data.pageId,
	);
	revalidatePath(`/user/${currentUser.handle}/page/${validate.data.pageId}`);
	return { success: true };
}
