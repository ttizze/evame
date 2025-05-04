"use server";

import { deleteActionFactory } from "@/app/[locale]/_action/delete-action-factory";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { deleteProjectComment } from "./_db/mutations.server";
export type CommentDeleteActionResponse = ActionResponse<
	undefined,
	{
		projectCommentId: number;
		projectId: number;
	}
>;
export const deleteProjectCommentAction = deleteActionFactory({
	inputSchema: z.object({
		projectCommentId: z.coerce.number(),
		projectId: z.string(),
	}),
	deleteById: ({ projectCommentId }, userId) =>
		deleteProjectComment(projectCommentId, userId).then(() => {}),

	buildRevalidatePaths: ({ projectId }, handle) => [
		`/user/${handle}/project/${projectId}`,
	],
});
