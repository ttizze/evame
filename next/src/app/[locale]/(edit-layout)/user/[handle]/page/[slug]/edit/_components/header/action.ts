"use server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { handlePageAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import type { PageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updatePageStatus } from "./_db/mutations.server";

const editPageStatusSchema = z.object({
	pageId: z.coerce.number().min(1),
	status: z.enum(["DRAFT", "PUBLIC", "ARCHIVE"]),
});

export type EditPageStatusActionState = ActionResponse<
	void,
	{
		pageId: number;
		status: string;
	}
>;

async function triggerAutoTranslationIfNeeded(
	status: string,
	pageId: number,
	sourceLocale: string,
	currentUserId: string,
) {
	if (status === "PUBLIC") {
		const geminiApiKey = process.env.GEMINI_API_KEY;
		if (!geminiApiKey || geminiApiKey === "undefined") {
			console.error("Gemini API key is not set. Page will not be translated.");
			return "Gemini API key is not set. Page will not be translated.";
		}
		handlePageAutoTranslation({
			currentUserId,
			pageId,
			sourceLocale,
			geminiApiKey,
		});
		return "Started translation.";
	}
	return "Page status updated successfully";
}

export async function editPageStatusAction(
	previousState: EditPageStatusActionState,
	formData: FormData,
): Promise<EditPageStatusActionState> {
	const parsedFormData = await parseFormData(editPageStatusSchema, formData);
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { pageId, status } = parsedFormData.data;
	const page = await getPageById(pageId);
	const currentUser = await getCurrentUser();
	if (!currentUser?.id || page?.userId !== currentUser.id) {
		return redirect("/auth/login");
	}
	await updatePageStatus(pageId, status as PageStatus);
	const message = await triggerAutoTranslationIfNeeded(
		status,
		pageId,
		page.sourceLocale,
		currentUser.id,
	);
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
	return { success: true, message };
}
