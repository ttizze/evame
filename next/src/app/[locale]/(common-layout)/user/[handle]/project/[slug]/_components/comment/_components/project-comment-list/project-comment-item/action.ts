"use server";

import { createDeleteAction } from "@/app/[locale]/_action/create-delete-action";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { deleteProjectComment } from "./_db/mutations.server";
export type CommentDeleteActionResponse = ActionResponse<
	void,
	{
		projectCommentId: number;
		projectId: number;
	}
>;
export const deleteProjectCommentAction = createDeleteAction({
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
