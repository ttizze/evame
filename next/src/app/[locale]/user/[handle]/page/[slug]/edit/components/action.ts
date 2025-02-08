"use server";
import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLocaleFromHtml } from "../../lib/get-locale-from-html";
import { handlePageTranslation } from "../lib/handle-page-translation";
import { processPageHtml } from "../lib/process-page-html";

export type EditPageContentActionState = ActionState & {
	fieldErrors?: {
		slug?: string[];
		title?: string[];
		pageContent?: string[];
	};
};

const editPageContentSchema = z.object({
	slug: z.string().min(1),
	title: z.string().min(1).max(100),
	pageContent: z.string().min(1),
});

export async function editPageContentAction(
	previousState: EditPageContentActionState,
	formData: FormData,
) {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return { generalError: "Unauthorized" };
	}
	const parsedFormData = editPageContentSchema.safeParse({
		slug: formData.get("slug"),
		title: formData.get("title"),
		pageContent: formData.get("pageContent"),
	});
	console.log(parsedFormData);
	console.log(formData);
	console.log(parsedFormData.error?.flatten().fieldErrors);
	if (!parsedFormData.success) {
		return { fieldErrors: parsedFormData.error.flatten().fieldErrors };
	}
	const { slug, title, pageContent } = parsedFormData.data;
	const sourceLocale = await getLocaleFromHtml(pageContent, title);
	const page = await processPageHtml(
		title,
		pageContent,
		slug,
		currentUser.id,
		sourceLocale,
	);
	if (page.status === "PUBLIC") {
		const geminiApiKey = process.env.GEMINI_API_KEY;
		if (!geminiApiKey) {
			throw new Error("Gemini API key is not set");
		}

		await handlePageTranslation({
			currentUserId: currentUser.id,
			pageId: page.id,
			sourceLocale,
			geminiApiKey,
			title,
		});
	}
	revalidatePath(`/user/${currentUser.handle}/page/${slug}`);
	return { success: "true" };
}
