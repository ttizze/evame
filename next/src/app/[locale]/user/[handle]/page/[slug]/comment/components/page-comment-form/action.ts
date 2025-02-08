"use server";
import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getLocaleFromHtml } from "../../../lib/get-locale-from-html";
import { createPageComment } from "../../functions/mutations.server";
import { processPageCommentHtml } from "../../lib/process-page-comment-html";
import { createPageCommentSchema } from "./index";

export async function commentAction(
	previousState: ActionState,
	formData: FormData,
) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}
	const validate = createPageCommentSchema.safeParse({
		pageId: formData.get("pageId"),
		content: formData.get("content"),
	});
	if (!validate.success) {
		return { generalError: "Invalid form data" };
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
