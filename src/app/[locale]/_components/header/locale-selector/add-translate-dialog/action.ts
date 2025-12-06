"use server";

import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";
import { translatePage } from "./service/translate-page.server";

/* ───────── 型 ───────── */

export type TranslateActionState = ActionResponse<
	{ translationJobs: TranslationJobForToast[] },
	{
		pageSlug: string;
		aiModel: string;
		targetLocale: string;
	}
>;

const schema = z.object({
	pageSlug: z.string().optional(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
});

/* ───────── Action ───────── */

export async function translateAction(
	_prev: TranslateActionState,
	formData: FormData,
): Promise<TranslateActionState> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) return { success: false, zodErrors: v.zodErrors };

	const { currentUser, data } = v;
	const provider = currentUser.plan === "premium" ? "vertex" : "gemini";

	if (data.pageSlug) {
		const result = await translatePage({
			pageSlug: data.pageSlug,
			aiModel: data.aiModel,
			locale: data.targetLocale,
			userId: currentUser.id,
			provider,
		});

		if (!result.success) {
			return { success: false, message: result.message };
		}

		return { success: true, data: { translationJobs: result.jobs } };
	}

	return { success: true, data: { translationJobs: [] } };
}
