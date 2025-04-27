"use server";

import { createDeleteAction } from "@/app/[locale]/_action/create-delete-action";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { deletePageComment } from "./_db/mutations.server";

export type CommentDeleteActionResponse = ActionResponse<
	void,
	{
		pageCommentId: number;
		pageId: number;
	}
>;
export const deletePageCommentAction = createDeleteAction({
	inputSchema: z.object({
		pageCommentId: z.coerce.number(),
		pageId: z.coerce.number(),
	}),

	deleteById: ({ pageCommentId }, userId) =>
		deletePageComment(pageCommentId, userId).then(() => {}),

	buildRevalidatePaths: ({ pageId }, handle) => [
		`/user/${handle}/page/${pageId}`,
	],

	buildSuccessRedirect: ({ pageId }, handle) =>
		`/user/${handle}/page/${pageId}`,
});
