"use server";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { getPageById } from "@/app/[locale]/_db/queries.server";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import type { PageStatus } from "@/db/types";
import { revalidateAllLocales } from "@/lib/revalidate-utils";
import { updatePageStatus } from "./db/mutations.server";
import { enqueuePageTranslation } from "./service/enqueue-page-translation.server";

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
	if (!currentUser?.id || page?.user.id !== currentUser.id) {
		redirect("/auth/login" as Route);
	}
	await updatePageStatus(pageId, status as PageStatus);

	let translationJobs: TranslationJobForToast[] | undefined;
	if (status === "PUBLIC") {
		translationJobs = await enqueuePageTranslation({
			currentUserId: currentUser.id,
			pageId,
			targetLocales: targetLocales.length > 0 ? targetLocales : ["en", "zh"],
			aiModel: "gemini-2.5-flash-lite",
		});
	}
	const basePath = `/user/${currentUser.handle}/page/${page.slug}`;
	revalidateAllLocales(basePath);

	return {
		success: true,
		data: translationJobs?.length ? { translationJobs } : undefined,
	};
}
