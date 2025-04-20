"use server";

import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";

import { uploadImage } from "@/app/[locale]/_lib/upload";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { processProjectHtml } from "../_components/_lib/process-project-html";
import { triggerAutoTranslationIfNeeded } from "../_components/_lib/trigger-auto-translation";
import { upsertProjectTags } from "../_db/mutations.server";
import {
	upsertIconTx,
	upsertImagesTx,
	upsertLinksTx,
} from "../_db/mutations.server";
import { iconSchema, imageSchema, linkSchema } from "../_db/mutations.server";
// Schema definitions

function tagSchema() {
	return z
		.string()
		.regex(/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/)
		.min(1)
		.max(15);
}

const formSchema = z.object({
	projectId: z.string().optional(),
	userLocale: z.string(),
	title: z.string().min(3).max(100),
	tagLine: z.string().min(3).max(100),
	description: z.string().min(10).max(500),
	tags: z.preprocess(parseJSONSafe, z.array(tagSchema()).max(5)),
	links: z.preprocess(parseJSONSafe, z.array(linkSchema).max(5)),
	images: z.preprocess(parseJSONSafe, z.array(imageSchema).max(10)),
	icon: z.preprocess(parseJSONSafe, iconSchema),
});

/****************************************************************************************
 * Types
 ****************************************************************************************/
export type ProjectFormValues = z.infer<typeof formSchema>;
export type ProjectActionResponse = ActionResponse<void, ProjectFormValues>;

/****************************************************************************************
 * Helpers
 ****************************************************************************************/
function parseJSONSafe(value: unknown) {
	if (!value || (typeof value === "string" && value.trim() === "")) {
		return undefined;
	}
	try {
		return JSON.parse(value as string);
	} catch {
		return [];
	}
}

async function uploadFiles(files: File[], names: string[]) {
	const out: Record<string, string> = {};
	for (let i = 0; i < files.length; i += 1) {
		const { success, data, message } = await uploadImage(files[i]);
		if (!success || !data?.imageUrl)
			throw new Error(message || "Upload failed");
		out[names[i]] = data.imageUrl;
	}
	return out;
}

function replaceTempUrls<T extends { url: string }>(
	items: T[],
	map: Record<string, string>,
): T[] {
	return items.map((item) => {
		if (item.url.startsWith("temp://upload/")) {
			const fileName = item.url.split("/").pop() ?? "";
			return { ...item, url: map[fileName] ?? item.url };
		}
		return item;
	});
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
	const parsed = await parseFormData(formSchema, formData);
	if (!parsed.success)
		return { success: false, zodErrors: parsed.error.flatten().fieldErrors };

	const {
		projectId,
		tagLine,
		tags,
		links,
		images,
		icon,
		userLocale,
		...projectData
	} = parsed.data;
	const combined = `${tagLine} ${projectData.description}`;
	const sourceLocale = await getLocaleFromHtml(combined, userLocale);

	const imageFiles = formData.getAll("imageFiles") as File[];
	const imageNames = formData.getAll("imageFileNames") as string[];
	const iconFile = formData.get("iconFile") as File | null;
	const iconFileName = formData.get("iconFileName") as string | null;
	const uploadedMap = imageFiles.length
		? await uploadFiles(imageFiles, imageNames)
		: {};
	const processedImages = replaceTempUrls(images, uploadedMap);

	if (projectId) {
		// Update existing project
		await prisma.project.findFirstOrThrow({
			where: { id: projectId, userId: currentUser.id },
		});
		await prisma.project.update({
			where: { id: projectId, userId: currentUser.id },
			data: {
				sourceLocale,
			},
		});
		await upsertProjectTags(tags, projectId);
		await upsertLinksTx(projectId, links);
		await upsertImagesTx(projectId, processedImages, icon?.id);
		await upsertIconTx(projectId, icon, iconFile, iconFileName);
	} else {
		// Create new project
		const created = await prisma.project.create({
			data: {
				...projectData,
				sourceLocale,
				userId: currentUser.id,
			},
		});

		await upsertProjectTags(tags, created.id);
		await upsertLinksTx(created.id, links);
		await upsertImagesTx(created.id, processedImages, icon?.id);
		await upsertIconTx(created.id, icon, iconFile, iconFileName);
	}

	const pid =
		projectId ??
		(
			await prisma.project.findFirst({
				where: { userId: currentUser.id },
				orderBy: { createdAt: "desc" },
				select: { id: true },
			})
		)?.id;
	if (pid) {
		await processProjectHtml(
			pid,
			tagLine,
			projectData.description,
			currentUser.id,
		);
		await triggerAutoTranslationIfNeeded(pid, sourceLocale, currentUser.id);
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
}
