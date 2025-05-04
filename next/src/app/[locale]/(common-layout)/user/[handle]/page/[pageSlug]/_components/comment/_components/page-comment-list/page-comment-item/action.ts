"use server";

import { deleteActionFactory } from "@/app/[locale]/_action/delete-action-factory";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { deletePageComment } from "./_db/mutations.server";

export type CommentDeleteActionResponse = ActionResponse<
	undefined,
	{
		pageCommentId: number;
		pageId: number;
	}
>;
export const deletePageCommentAction = deleteActionFactory({
	inputSchema: z.object({
		pageCommentId: z.coerce.number(),
		pageId: z.coerce.number(),
	}),

	deleteById: ({ pageCommentId }, userId) =>
		deletePageComment(pageCommentId, userId).then(() => {}),

	buildRevalidatePaths: ({ pageId }, handle) => [
		`/user/${handle}/page/${pageId}`,
	],
});
