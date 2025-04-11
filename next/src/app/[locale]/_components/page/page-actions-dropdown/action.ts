"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { parseFormData } from "@/lib/parse-form-data";
import { redirect } from "next/navigation";
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
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		return redirect("/auth/login");
	}
	const parsedFormData = await parseFormData(togglePublishSchema, formData);
	if (!parsedFormData.success) {
		return {
			success: false,
			message: "Invalid form data",
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { pageId } = parsedFormData.data;
	await togglePagePublicStatus(pageId, currentUser.id);
	return { success: true, message: "Page status updated successfully" };
}
