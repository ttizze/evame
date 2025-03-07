"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deletePageComment } from "./_db/mutations.server";
import { getPageCommentById } from "./_db/queries.server";

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

type Dependencies = {
	getCurrentUser: typeof getCurrentUser;
	parseFormData: typeof parseFormData;
	getPageCommentById: typeof getPageCommentById;
	deletePageComment: typeof deletePageComment;
	revalidatePath: typeof revalidatePath;
	redirect: typeof redirect;
};

export async function commentDeleteAction(
	previousState: CommentDeleteActionResponse,
	formData: FormData,
	deps: Dependencies = {
		getCurrentUser,
		parseFormData,
		getPageCommentById,
		deletePageComment,
		revalidatePath,
		redirect,
	},
): Promise<CommentDeleteActionResponse> {
	const currentUser = await deps.getCurrentUser();

	if (!currentUser?.id) {
		return deps.redirect("/auth/login");
	}

	const parsedFormData = await deps.parseFormData(
		commentDeleteSchema,
		formData,
	);
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}

	const { pageCommentId, pageId } = parsedFormData.data;
	const pageComment = await deps.getPageCommentById(pageCommentId);
	if (!pageComment || pageComment.userId !== currentUser.id) {
		return {
			success: false,
			message: "You are not allowed to delete this comment",
		};
	}

	await deps.deletePageComment(pageCommentId);

	deps.revalidatePath(`/user/${currentUser.handle}/page/${pageId}`);
	return { success: true };
}
