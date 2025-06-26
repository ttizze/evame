"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { deleteOwnTranslation } from "./db/mutations.server";

const schema = z.object({
	translationId: z.number(),
});

export async function deleteTranslationAction(
	previousState: ActionResponse,
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
	await deleteOwnTranslation(currentUser.handle, translationId);
	revalidatePath(`/user/${currentUser.handle}/page/}`);
	return { success: true, data: undefined };
}
