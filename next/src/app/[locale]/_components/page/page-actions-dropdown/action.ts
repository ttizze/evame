"use server";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { z } from "zod";
import { togglePagePublicStatus } from "./db/mutations.server";
const togglePublishSchema = z.object({
	pageId: z.coerce.number(),
});

export type TogglePublishState = ActionResponse<
	void,
	{
		pageId: number;
	}
>;

export async function togglePublishAction(
	previousState: TogglePublishState,
	formData: FormData,
): Promise<TogglePublishState> {
	const v = await authAndValidate(togglePublishSchema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = v;
	const { pageId } = data;
	await togglePagePublicStatus(pageId, currentUser.id);
	return {
		success: true,
		data: undefined,
		message: "Page status updated successfully",
	};
}
