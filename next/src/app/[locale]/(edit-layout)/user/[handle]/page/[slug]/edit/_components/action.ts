"use server";
import { getLocaleFromHtml } from "@/app/[locale]/_lib/get-locale-from-html";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { processPageHtml } from "../_lib/process-page-html";

export type EditPageContentActionState = ActionResponse<
	void,
	{
		slug: string;
		userLocale: string;
		title: string;
		pageContent: string;
	}
>;

const editPageContentSchema = z.object({
	slug: z.string().min(1),
	userLocale: z.string(),
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
	const parsedFormData = await parseFormData(editPageContentSchema, formData);
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { slug, title, pageContent, userLocale } = parsedFormData.data;
	const sourceLocale = await getLocaleFromHtml(pageContent, userLocale);
	await processPageHtml(title, pageContent, slug, currentUser.id, sourceLocale);

	revalidatePath(`/user/${currentUser.handle}/page/${slug}`);
	return { success: true, message: "Page updated successfully" };
}
