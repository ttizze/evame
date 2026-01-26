"use server";

import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { updateUserTargetLocales } from "./db/mutations.server";

const schema = z.object({
	locales: z.array(z.string()).max(4),
});

export async function saveTargetLocalesAction(
	_previousState: ActionResponse<boolean>,
	formData: FormData,
): Promise<ActionResponse<boolean>> {
	const result = await authAndValidate(schema, formData);
	if (!result.success) {
		return { success: false, zodErrors: result.zodErrors };
	}

	const { currentUser, data } = result;
	await updateUserTargetLocales(currentUser.id, data.locales);
	return { success: true, data: true };
}
