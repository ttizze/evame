"use server";

import { revalidatePath } from "next/cache";
import { deleteProject } from "./db/mutation.server";

export async function deleteProjectAction(projectId: string) {
	if (!projectId) {
		return {
			success: false,
			message: "Project ID is required",
		};
	}

	await deleteProject(projectId);
	revalidatePath("/user/[handle]/project-management");

	return {
		success: true,
	};
}
