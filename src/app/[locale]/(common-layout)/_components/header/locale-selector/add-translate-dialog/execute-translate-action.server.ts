import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { TranslateActionState } from "./action";
import { translatePage } from "./service/translate-page.server";

const schema = z.object({
	pageSlug: z.string().optional(),
	aiModel: z.string().min(1),
	targetLocale: z.string().min(1),
});

export async function executeTranslateAction(
	formData: FormData,
): Promise<TranslateActionState> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) return { success: false, zodErrors: v.zodErrors };

	const { currentUser, data } = v;

	if (data.pageSlug) {
		const result = await translatePage({
			pageSlug: data.pageSlug,
			aiModel: data.aiModel,
			locale: data.targetLocale,
			userId: currentUser.id,
		});

		if (!result.success) {
			return { success: false, message: result.message };
		}

		return { success: true, data: { translationJobs: result.jobs } };
	}

	return { success: true, data: { translationJobs: [] } };
}
