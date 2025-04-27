"use server";

import { createDeleteAction } from "@/app/[locale]/_action/create-delete-action";
import { z } from "zod";
import { deleteProject } from "./db/mutation.server";
export const deleteProjectAction = createDeleteAction({
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
