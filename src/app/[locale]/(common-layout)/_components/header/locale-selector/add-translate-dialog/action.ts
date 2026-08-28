import { createServerFn } from "@tanstack/react-start";
import type { ActionResponse } from "@/app/types";
import type { TranslationJobForToast } from "@/app/types/translation-job";

/* ───────── 型 ───────── */

export type TranslateActionState = ActionResponse<
	{ translationJobs: TranslationJobForToast[] },
	{
		pageSlug: string;
		aiModel: string;
		targetLocale: string;
	}
>;

export const translateAction = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		if (!(data instanceof FormData)) {
			throw new Error("Expected FormData");
		}
		return data;
	})
	.handler(async ({ data }) => {
		const { executeTranslateAction } = await import(
			"./execute-translate-action.server"
		);
		return executeTranslateAction(data);
	});
