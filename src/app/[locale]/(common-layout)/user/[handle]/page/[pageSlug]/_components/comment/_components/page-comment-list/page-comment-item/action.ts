"use server";

import { z } from "zod";
import { deleteActionFactory } from "@/app/[locale]/_action/delete-action-factory";
import type { ActionResponse } from "@/app/types";
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
});
