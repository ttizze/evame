"use server";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import type { PageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updatePageStatus } from "./_db/mutations.server";
import { handlePageTranslation } from "./_lib/handle-page-translation";
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
	if (status === "PUBLIC") {
		console.log("pageStatus", status);
		const geminiApiKey = process.env.GEMINI_API_KEY;
		if (!geminiApiKey || geminiApiKey === "undefined") {
			console.error("geminiApiKey is not set. Page will not be translated.");
			revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
			return {
				success: true,
				message: "Gemini API key is not set. Page will not be translated.",
			};
		}
		handlePageTranslation({
			currentUserId: currentUser.id,
			pageId: page.id,
			sourceLocale: page.sourceLocale,
			geminiApiKey,
		});
	}
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
	return { success: true, message: "Page status updated successfully" };
}
