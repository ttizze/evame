"use server";

import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deletePageComment } from "./db/mutations.server";

const commentDeleteSchema = z.object({
	pageCommentId: z.number(),
	pageId: z.number(),
});

export async function commentDeleteAction(
	previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const session = await auth();
	const currentUser = session?.user;

	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}

	const validate = commentDeleteSchema.safeParse({
		pageCommentId: Number(formData.get("pageCommentId")),
		pageId: Number(formData.get("pageId")),
	});

	if (!validate.success) {
		return { error: "Invalid form data" };
	}

	await deletePageComment(validate.data.pageCommentId);

	revalidatePath(`/user/${currentUser.handle}/page/${validate.data.pageId}`);
	return { success: true };
}
