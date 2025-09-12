"use server";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { revalidatePageTreeAllLocales } from "@/lib/revalidate-utils";
import { findPageIdBySegmentTranslationId } from "../_db/queries.server";
import { deleteOwnTranslation } from "./db/mutations.server";

const schema = z.object({
	translationId: z.coerce.number(),
	userLocale: z.string().min(1),
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
	// Revalidate page + parent/children across all locales
	await revalidatePageTreeAllLocales(pageId);
	return { success: true, data: undefined };
}
