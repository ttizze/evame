"use server";

import type { ActionResponse } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deletePageComment } from "./db/mutations.server";
import { redirect } from "next/navigation";
const commentDeleteSchema = z.object({
	pageCommentId: z.number(),
	pageId: z.number(),
});

export type CommentDeleteActionResponse = ActionResponse<void, {
	pageCommentId: number;
	pageId: number;
}>;

export async function commentDeleteAction(
	previousState: CommentDeleteActionResponse,
	formData: FormData,
): Promise<CommentDeleteActionResponse> {
	const session = await auth();
	const currentUser = session?.user;

	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}

	const validate = commentDeleteSchema.safeParse({
		pageCommentId: Number(formData.get("pageCommentId")),
		pageId: Number(formData.get("pageId")),
	});

	if (!validate.success) {
		return {
			success: false,
			zodErrors: validate.error.flatten().fieldErrors,
		};
	}

	await deletePageComment(validate.data.pageCommentId);

	revalidatePath(`/user/${currentUser.handle}/page/${validate.data.pageId}`);
	return { success: true };
}
