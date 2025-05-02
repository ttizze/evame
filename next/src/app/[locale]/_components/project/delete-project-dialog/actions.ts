"use server";

import { deleteActionFactory } from "@/app/[locale]/_action/delete-action-factory";
import { z } from "zod";
import { deleteProject } from "./db/mutation.server";
export const deleteProjectAction = deleteActionFactory({
	inputSchema: z.object({
		projectId: z.coerce.number().min(1),
	}),
	deleteById: ({ projectId }, userId) =>
		deleteProject(projectId, userId).then(() => {}),

	buildRevalidatePaths: (_input, userHandle) => [
		`/user/${userHandle}/project-management`,
		`/user/${userHandle}`,
	],
});
