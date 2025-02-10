"use server";
import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocaleFromHtml } from "@/app/[locale]/lib/get-locale-from-html";
import { createPageComment } from "../../db/mutations.server";
import { processPageCommentHtml } from "../../lib/process-page-comment-html";

const createPageCommentSchema = z.object({
	pageId: z.coerce.number(),
	content: z.string().min(1, "Comment cannot be empty"),
});

export async function commentAction(
	previousState: ActionState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}
	const validate = createPageCommentSchema.safeParse({
		pageId: formData.get("pageId"),
		content: formData.get("content"),
	});
	if (!validate.success) {
		return { generalError: validate.error.message };
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
	return { success: "Comment created successfully" };
}
