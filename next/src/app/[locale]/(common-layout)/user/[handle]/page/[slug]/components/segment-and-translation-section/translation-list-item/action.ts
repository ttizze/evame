"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteOwnTranslation } from "./db/mutations.server";
import { redirect } from "next/navigation";
const schema = z.object({
	translationId: z.number(),
});

export async function deleteTranslationAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const translationId = Number.parseInt(
		formData.get("translationId") as string,
	);
	const validation = schema.safeParse({ translationId });
	if (!validation.success) {
		return {
			success: false,
			zodErrors: validation.error.flatten().fieldErrors,
		};
	}
	await deleteOwnTranslation(currentUser.handle, validation.data.translationId);
	revalidatePath(`/user/${currentUser.handle}/page/`);
	return { success: true };
}
