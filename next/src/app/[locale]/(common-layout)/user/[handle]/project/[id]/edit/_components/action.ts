"use server";

import { generateHashForText } from "@/app/[locale]/_lib/generate-hash-for-text";
import { uploadImage } from "@/app/[locale]/_lib/upload";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { upsertProjectTags } from "../_db/mutations.server";

// Schema definitions
const projectLinkSchema = z.object({
	id: z.string().optional(),
	url: z.string().url({
		message: "Please enter a valid URL.",
	}),
	description: z.string().max(50, {
		message: "Description must not exceed 50 characters.",
	}),
});

const projectImageSchema = z.object({
	id: z.string().optional(),
	url: z.string(),
	caption: z.string().max(200, {
		message: "Caption must not exceed 200 characters.",
	}),
	order: z.number().int().min(0),
});

const projectFormSchema = z.object({
	projectId: z.string().optional(),
	title: z
		.string()
		.min(3, { message: "Title must be at least 3 characters." })
		.max(100, { message: "Title must not exceed 100 characters." }),
	tagLine: z
		.string()
		.min(3, { message: "Tag line must be at least 3 characters." })
		.max(100, { message: "Tag line must not exceed 100 characters." }),
	description: z
		.string()
		.min(10, { message: "Description must be at least 10 characters." })
		.max(500, { message: "Description must not exceed 500 characters." }),
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
	images: z.preprocess(
		(value) => {
			try {
				return JSON.parse(value as string);
			} catch {
				return [];
			}
		},
		z.array(projectImageSchema).max(10, "Maximum 10 images allowed"),
	),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
export type ProjectActionResponse = ActionResponse<void, ProjectFormValues>;

// Type definitions
type ProjectLinkSchemaType = z.infer<typeof projectLinkSchema>;
type ProjectImageSchemaType = z.infer<typeof projectImageSchema>;

// Helper functions
async function createOrUpdateProjectSegment(
	projectId: string,
	text: string,
	number: number,
) {
	const textAndOccurrenceHash = generateHashForText(text, 0);

	const existingSegment = await prisma.projectSegment.findUnique({
		where: {
			projectId_number: { projectId, number },
		},
	});

	if (existingSegment) {
		return prisma.projectSegment.update({
			where: { id: existingSegment.id },
			data: { text, textAndOccurrenceHash },
		});
	}

	return prisma.projectSegment.create({
		data: { projectId, number, text, textAndOccurrenceHash },
	});
}

async function uploadProjectImages(
	imageFiles: File[],
	imageFileNames: string[],
) {
	const uploadedImageUrls: Record<string, string> = {};

	for (let i = 0; i < imageFiles.length; i++) {
		const file = imageFiles[i];
		const fileName = imageFileNames[i];
		const result = await uploadImage(file);

		if (result.success && result.data?.imageUrl) {
			uploadedImageUrls[fileName] = result.data.imageUrl;
		} else {
			throw new Error(result.message || "Failed to upload image");
		}
	}

	return uploadedImageUrls;
}

function processImages(
	images: ProjectImageSchemaType[],
	uploadedImageUrls: Record<string, string>,
): ProjectImageSchemaType[] {
	return images.map((image) => {
		if (image.url.startsWith("temp://upload/")) {
			const fileName = image.url.split("/").pop() || "";
			const uploadedUrl = uploadedImageUrls[fileName];

			if (!uploadedUrl) {
				console.error(`No uploaded URL found for image: ${fileName}`);
			}

			return { ...image, url: uploadedUrl || image.url };
		}
		return image;
	});
}

async function handleProjectLinks(
	links: ProjectLinkSchemaType[],
	projectId: string,
	existingLinkIds: string[] = [],
) {
	// Get IDs of links that will be updated
	const newLinkIds = links
		.filter((link): link is ProjectLinkSchemaType & { id: string } => !!link.id)
		.map((link) => link.id);

	// Delete links that are no longer present
	const linkIdsToDelete = existingLinkIds.filter(
		(id) => !newLinkIds.includes(id),
	);

	if (linkIdsToDelete.length > 0) {
		await prisma.projectLink.deleteMany({
			where: { id: { in: linkIdsToDelete } },
		});
	}

	// Update or create links
	for (const link of links) {
		if (link.id) {
			await prisma.projectLink.update({
				where: { id: link.id },
				data: { url: link.url, description: link.description },
			});
		} else {
			await prisma.projectLink.create({
				data: {
					url: link.url,
					description: link.description,
					projectId,
				},
			});
		}
	}
}

async function handleProjectImages(
	images: ProjectImageSchemaType[],
	projectId: string,
	existingImageIds: string[] = [],
) {
	// Get IDs of images that will be updated
	const newImageIds = images
		.filter(
			(image): image is ProjectImageSchemaType & { id: string } => !!image.id,
		)
		.map((image) => image.id);

	// Delete images that are no longer present
	const imageIdsToDelete = existingImageIds.filter(
		(id) => !newImageIds.includes(id),
	);

	if (imageIdsToDelete.length > 0) {
		await prisma.projectImage.deleteMany({
			where: { id: { in: imageIdsToDelete } },
		});
	}

	// Update or create images
	for (const image of images) {
		if (image.id) {
			await prisma.projectImage.update({
				where: { id: image.id },
				data: {
					url: image.url,
					caption: image.caption,
					order: image.order,
				},
			});
		} else {
			await prisma.projectImage.create({
				data: {
					url: image.url,
					caption: image.caption,
					order: image.order,
					projectId,
				},
			});
		}
	}
}

// Main action function
export async function projectAction(
	previousState: ProjectActionResponse,
	formData: FormData,
): Promise<ProjectActionResponse> {
	// Authentication check
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}

	// Validate form data
	const parsed = await parseFormData(projectFormSchema, formData);
	if (!parsed.success) {
		return {
			success: false,
			zodErrors: parsed.error.flatten().fieldErrors,
		};
	}

	// Extract data
	const { projectId, tags, links, images, tagLine, ...projectData } =
		parsed.data;

	try {
		// Handle image uploads
		const imageFiles = formData.getAll("imageFiles") as File[];
		const imageFileNames = formData.getAll("imageFileNames") as string[];
		const uploadedImageUrls =
			imageFiles.length > 0
				? await uploadProjectImages(imageFiles, imageFileNames)
				: {};

		// Process images with uploaded URLs
		const processedImages = processImages(images, uploadedImageUrls);

		if (projectId) {
			// Update existing project
			const existingProject = await prisma.project.findUnique({
				where: { id: projectId },
				include: { user: true, links: true, images: true },
			});

			if (!existingProject) {
				return { success: false, message: "Project not found" };
			}

			if (existingProject.userId !== currentUser.id) {
				return {
					success: false,
					message: "You don't have permission to edit this project",
				};
			}

			// Update project data
			await prisma.project.update({
				where: { id: projectId },
				data: projectData,
			});

			// Update tagLine segment
			await createOrUpdateProjectSegment(projectId, tagLine, 0);

			// Update tags
			await upsertProjectTags(tags, projectId);

			// Update links and images
			const existingLinkIds = existingProject.links.map((link) => link.id);
			const existingImageIds = existingProject.images.map((image) => image.id);

			await handleProjectLinks(links, projectId, existingLinkIds);
			await handleProjectImages(processedImages, projectId, existingImageIds);
		} else {
			// Create new project
			const newProject = await prisma.project.create({
				data: {
					...projectData,
					userId: currentUser.id,
				},
			});

			// Create tagLine segment
			await createOrUpdateProjectSegment(newProject.id, tagLine, 0);

			// Create tags
			if (tags.length > 0) {
				await upsertProjectTags(tags, newProject.id);
			}

			// Create links and images
			if (links.length > 0) {
				await handleProjectLinks(links, newProject.id);
			}

			if (processedImages.length > 0) {
				await handleProjectImages(processedImages, newProject.id);
			}
		}

		// Revalidate paths
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
			message:
				error instanceof Error ? error.message : "An unexpected error occurred",
		};
	}
}
