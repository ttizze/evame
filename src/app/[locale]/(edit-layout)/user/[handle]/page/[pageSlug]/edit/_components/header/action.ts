"use server";
import type { PageStatus } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import { handlePageAutoTranslation } from "@/app/[locale]/_lib/auto-translation/handle-auto-translation";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { updatePageStatus } from "./_db/mutations.server";

const editPageStatusSchema = z.object({
	pageId: z.coerce.number().min(1),
	status: z.enum(["DRAFT", "PUBLIC", "ARCHIVE"]),
	targetLocales: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(",").filter((l) => l) : [])),
});

export type EditPageStatusActionState = ActionResponse<
	{ translationJobs: TranslationJobForToast[] } | undefined,
	{
		pageId: number;
		status: string;
		targetLocales: string[];
	}
>;

async function triggerAutoTranslation(
	pageId: number,
	sourceLocale: string,
	currentUserId: string,
	targetLocales: string[],
) {
	return await handlePageAutoTranslation({
		currentUserId,
		pageId,
		sourceLocale,
		targetLocales,
	});
}

export async function editPageStatusAction(
	_previousState: EditPageStatusActionState,
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
	const { pageId, status, targetLocales } = data;
	const page = await getPageById(pageId);
	if (!currentUser?.id || page?.userId !== currentUser.id) {
		redirect("/auth/login" as Route);
	}
	await updatePageStatus(pageId, status as PageStatus);

	let translationJobs: TranslationJobForToast[] | undefined;
	if (status === "PUBLIC") {
		translationJobs = await triggerAutoTranslation(
			pageId,
			page.sourceLocale,
			currentUser.id,
			targetLocales,
		);
	}
	revalidatePath(`/user/${currentUser.handle}/page/${page.slug}/edit`);
	return {
		success: true,
		data: translationJobs?.length ? { translationJobs } : undefined,
	};
}
