"use server";

import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { upsertProjectTags } from "../_db/tag-queries.server";

const projectLinkSchema = z.object({
	id: z.string().optional(),
	url: z.string().url({
		message: "Please enter a valid URL.",
	}),
	description: z.string().max(50, {
		message: "Description must not exceed 50 characters.",
	}),
});

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
	tags: z.preprocess(
		(value) => {
			try {
				return JSON.parse(value as string);
			} catch {
				return [];
			}
		},
		z
			.array(
				z
					.string()
					.regex(
						/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/,
						"Symbols and spaces cannot be used in tags",
					)
					.min(1, "Tag must be at least 1 character")
					.max(15, "Tag must not exceed 15 characters"),
			)
			.max(5, "Maximum 5 tags allowed"),
	),
	links: z.preprocess(
		(value) => {
			try {
				return JSON.parse(value as string);
			} catch {
				return [];
			}
		},
		z.array(projectLinkSchema).max(5, "Maximum 5 links allowed"),
	),
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

	const { projectId, tags, links, ...projectData } = parsed.data;

	try {
		if (projectId) {
			// Updating existing project
			const existingProject = await prisma.project.findUnique({
				where: { id: projectId },
				include: { user: true, links: true },
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

			// Update project
			await prisma.project.update({
				where: { id: projectId },
				data: projectData,
			});

			// Update tags
			await upsertProjectTags(tags, projectId);

			// Handle links
			// First, collect existing link IDs for later deletion
			const existingLinkIds = existingProject.links.map((link) => link.id);
			const newLinkIds = links
				.filter((link) => link.id)
				.map((link) => link.id as string);

			// Find links to delete (those in existing but not in new)
			const linkIdsToDelete = existingLinkIds.filter(
				(id) => !newLinkIds.includes(id),
			);

			if (linkIdsToDelete.length > 0) {
				await prisma.projectLink.deleteMany({
					where: {
						id: {
							in: linkIdsToDelete,
						},
					},
				});
			}

			// Upsert links
			for (const link of links) {
				if (link.id) {
					// Update existing link
					await prisma.projectLink.update({
						where: { id: link.id },
						data: {
							url: link.url,
							description: link.description,
						},
					});
				} else {
					// Create new link
					await prisma.projectLink.create({
						data: {
							url: link.url,
							description: link.description,
							projectId,
						},
					});
				}
			}
		} else {
			// Create new project
			const newProject = await prisma.project.create({
				data: {
					...projectData,
					userId: currentUser.id,
				},
			});

			// Create tags
			if (tags.length > 0) {
				await upsertProjectTags(tags, newProject.id);
			}

			// Create links
			if (links.length > 0) {
				await prisma.projectLink.createMany({
					data: links.map((link) => ({
						url: link.url,
						description: link.description,
						projectId: newProject.id,
					})),
				});
			}
		}

		revalidatePath(`/user/${currentUser.handle}/project-management`);
		if (projectId) {
			revalidatePath(`/user/${currentUser.handle}/project/${projectId}`);
		}

		return {
			success: true,
			message: `Project ${projectId ? "updated" : "created"} successfully`,
		};
	} catch (error) {
		console.error("Project action error:", error);
		return {
			success: false,
			message: "Failed to process project. Please try again.",
		};
	}
}
