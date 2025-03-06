"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPageCommentById } from "../_db/queries.server";
import { deletePageComment } from "./_db/mutations.server";

const commentDeleteSchema = z.object({
	pageCommentId: z.coerce.number(),
	pageId: z.coerce.number(),
});

export type CommentDeleteActionResponse = ActionResponse<
	void,
	{
		pageCommentId: number;
		pageId: number;
	}
>;

export async function commentDeleteAction(
	previousState: CommentDeleteActionResponse,
	formData: FormData,
): Promise<CommentDeleteActionResponse> {
	const currentUser = await getCurrentUser();

	if (!currentUser?.id) {
		return redirect("/auth/login");
	}

	const parsedFormData = await parseFormData(commentDeleteSchema, formData);
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}

	const { pageCommentId, pageId } = parsedFormData.data;
	const pageComment = await getPageCommentById(pageCommentId);
	if (!pageComment || pageComment.userId !== currentUser.id) {
		return {
			success: false,
			message: "You are not allowed to delete this comment",
		};
	}

	await deletePageComment(pageCommentId);

	revalidatePath(`/user/${currentUser.handle}/page/${pageId}`);
	return { success: true };
}
