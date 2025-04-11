"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteProject } from "./db/mutation.server";

const deleteProjectSchema = z.object({
	projectId: z.string().min(1),
});

export async function deleteProjectAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const parsedFormData = await parseFormData(deleteProjectSchema, formData);
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { projectId } = parsedFormData.data;
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}

	await deleteProject(projectId, currentUser.id);
	revalidatePath("/user/[handle]/project-management");

	return {
		success: true,
		message: "Project deleted successfully",
	};
}
