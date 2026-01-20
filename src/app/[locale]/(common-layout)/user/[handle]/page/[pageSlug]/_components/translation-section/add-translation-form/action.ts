"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { addTranslationService } from "./service/add-translation.server";

const schema = z.object({
	locale: z.string(),
	segmentId: z.coerce.number(),
	text: z
		.string()
		.min(1, "Translation cannot be empty")
		.max(30000, "Translation is too long")
		.transform((val) => val.trim()),
});

export async function addTranslationFormAction(
	_previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = v;
	const { segmentId, text, locale } = data;

	const result = await addTranslationService(
		segmentId,
		text,
		currentUser.id,
		locale,
	);

	if (!result.success) {
		return {
			success: false,
			message: result.message,
		};
	}

	updateTag(`page:${result.pageId}`);

	return {
		success: true,
		data: undefined,
	};
}
