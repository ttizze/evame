"use server";

import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";

import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { uploadImage } from "@/app/[locale]/_lib/upload";
import type { ActionResponse } from "@/app/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertProjectTags } from "../_db/mutations.server";
import {
	upsertIconTx,
	upsertImagesTx,
	upsertLinksTx,
} from "../_db/mutations.server";
import { iconSchema, imageSchema, linkSchema } from "../_db/mutations.server";
import { processProjectHtml } from "./_lib/process-project-html";
import { triggerAutoTranslationIfNeeded } from "./_lib/trigger-auto-translation";
// Schema definitions

function tagSchema() {
	return z
		.string()
		.regex(/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/)
		.min(1)
		.max(15);
}

const formSchema = z.object({
	projectId: z.coerce.number().min(1),
	slug: z.string(),
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
	const v = await authAndValidate(formSchema, formData);
	if (!v.success) {
		return { success: false, zodErrors: v.zodErrors };
	}
	const { currentUser, data } = v;

	const {
		projectId,
		tagLine,
		tags,
		links,
		images,
		icon,
		userLocale,
		slug,
		...projectData
	} = data;
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
	const updatedProject = await processProjectHtml({
		slug,
		title: projectData.title,
		description: projectData.description,
		tagLine,
		projectId,
		userId: currentUser.id,
		sourceLocale,
	});
	await upsertProjectTags(tags, updatedProject.id);
	await upsertLinksTx(updatedProject.id, links);
	await upsertImagesTx(updatedProject.id, processedImages, icon?.id);
	await upsertIconTx(updatedProject.id, icon, iconFile, iconFileName);
	await triggerAutoTranslationIfNeeded(
		updatedProject.id,
		sourceLocale,
		currentUser.id,
	);

	revalidatePath(`/user/${currentUser.handle}/project/${slug}`);

	return {
		success: true,
		message: `Project ${projectId ? "updated" : "created"} successfully`,
	};
}
