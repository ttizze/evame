"use server";

import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { db } from "@/db";

const deleteContextSchema = z.object({
	id: z.coerce.number().min(1),
});

export type DeleteContextActionState = ActionResponse<boolean>;

export async function deleteContextAction(
	_previousState: DeleteContextActionState,
	formData: FormData,
): Promise<DeleteContextActionState> {
	const v = await authAndValidate(deleteContextSchema, formData);
	if (!v.success) {
		return { success: false, zodErrors: v.zodErrors };
	}
	const { currentUser, data } = v;

	try {
		const result = await db
			.deleteFrom("translationContexts")
			.where("id", "=", data.id)
			.where("userId", "=", currentUser.id)
			.executeTakeFirst();

		if (result.numDeletedRows === BigInt(0)) {
			return { success: false, message: "Context not found" };
		}
		return { success: true, data: true };
	} catch {
		return { success: false, message: "Failed to delete context" };
	}
}
