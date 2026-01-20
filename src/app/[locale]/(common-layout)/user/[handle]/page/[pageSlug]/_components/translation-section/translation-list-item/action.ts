"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { findPageIdBySegmentTranslationId } from "../_db/queries.server";
import { deleteOwnTranslation } from "./db/mutations.server";

const schema = z.object({
	translationId: z.coerce.number(),
});

export async function deleteTranslationAction(
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
	const { translationId } = data;
	// Resolve page info BEFORE deletion
	const pageId = await findPageIdBySegmentTranslationId(translationId);
	await deleteOwnTranslation(currentUser.handle, translationId);
	// Revalidate page for the current locale
	updateTag(`page:${pageId}`);
	return { success: true, data: undefined };
}
