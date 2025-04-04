"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const projectFormSchema = z.object({
	projectId: z.string().optional(),
	title: z
		.string()
		.min(3, {
			message: "Title must be at least 3 characters.",
		})
		.max(100, {
			message: "Title must not exceed 100 characters.",
		}),
	description: z
		.string()
		.min(10, {
			message: "Description must be at least 10 characters.",
		})
		.max(500, {
			message: "Description must not exceed 500 characters.",
		}),
	tagIds: z.array(z.string()).optional(),
	url: z
		.string()
		.url({
			message: "Please enter a valid URL.",
		})
		.optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export type ProjectActionResponse = ActionResponse<void, ProjectFormValues>;

export async function projectAction(
	previousState: ProjectActionResponse,
	formData: FormData,
): Promise<ProjectActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}

	const parsed = await parseFormData(projectFormSchema, formData);
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const { projectId, tagIds, url, ...projectData } = parsed.data;
	if (projectId) {
		const existingProject = await prisma.project.findUnique({
			where: { id: projectId },
			include: { user: true },
		});

		if (!existingProject) {
			return {
				success: false,
				message: "Project not found",
			};
		}

		// Check if the current user is the owner of the project
		if (existingProject.userId !== currentUser.id) {
			return {
				success: false,
				message: "You don't have permission to edit this project",
			};
		}
		// Update existing project
		await prisma.project.update({
			where: { id: projectId },
			data: {
				...projectData,
				// Handle links update logic here if needed
			},
		});
	} else {
		// Create new project
		await prisma.project.create({
			data: {
				...projectData,
				userId: currentUser.id,
				// Handle links creation logic here if needed
			},
		});
	}
	revalidatePath(`/user/${currentUser.handle}/project-management`);

	return {
		success: true,
		message: "Project updated successfully",
	};
}
