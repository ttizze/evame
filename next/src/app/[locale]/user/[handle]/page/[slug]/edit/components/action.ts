"use server";
import { getLocaleFromHtml } from "@/app/[locale]/lib/get-locale-from-html";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { handlePageTranslation } from "../lib/handle-page-translation";
import { processPageHtml } from "../lib/process-page-html";

export type EditPageContentActionState = ActionResponse<void, {
	slug: string;
	title: string;
	pageContent: string;
}>;

const editPageContentSchema = z.object({
	slug: z.string().min(1),
	title: z.string().min(1).max(100),
	pageContent: z.string().min(1),
});

export async function editPageContentAction(
	previousState: EditPageContentActionState,
	formData: FormData,
): Promise<EditPageContentActionState> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return redirect("/auth/login");
	}
	const parsedFormData = editPageContentSchema.safeParse({
		slug: formData.get("slug"),
		title: formData.get("title"),
		pageContent: formData.get("pageContent"),
	});
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
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
		if (!geminiApiKey || geminiApiKey === "undefined") {
			return { success: true, message: "Gemini API key is not set. Page will not be translated." };
		}

		await handlePageTranslation({
			currentUserId: currentUser.id,
			pageId: page.id,
			sourceLocale,
			geminiApiKey,
			title,
		});
	}
	revalidatePath(`/user/${currentUser.handle}/page/${slug}/edit`);
	return { success: true, message: "Page updated successfully" };
}
