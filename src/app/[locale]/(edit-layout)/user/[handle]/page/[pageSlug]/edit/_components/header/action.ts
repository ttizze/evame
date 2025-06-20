"use server";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { handlePageAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
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
	{ translationJobs: TranslationJobForToast[] } | undefined,
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
	if (status !== "PUBLIC") return undefined;
	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey || geminiApiKey === "undefined") {
		console.error("Gemini API key is not set. Page will not be translated.");
		return undefined;
	}
	return await handlePageAutoTranslation({
		currentUserId,
		pageId,
		sourceLocale,
		geminiApiKey,
	});
}

export async function editPageStatusAction(
	previousState: EditPageStatusActionState,
	formData: FormData,
): Promise<EditPageStatusActionState> {
	const v = await authAndValidate(editPageStatusSchema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = v;
	const { pageId, status } = data;
	const page = await getPageById(pageId);
	if (!currentUser?.id || page?.userId !== currentUser.id) {
		return redirect("/auth/login");
	}
	await updatePageStatus(pageId, status as PageStatus);
	const translationJobs = await triggerAutoTranslationIfNeeded(
		status,
		pageId,
		page.sourceLocale,
		currentUser.id,
	);
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
	return {
		success: true,
		data: translationJobs?.length ? { translationJobs } : undefined,
	};
}
