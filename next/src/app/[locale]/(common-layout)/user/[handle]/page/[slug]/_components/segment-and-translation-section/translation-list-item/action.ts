"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteOwnTranslation } from "./db/mutations.server";
const schema = z.object({
	translationId: z.number(),
});

export async function deleteTranslationAction(
	previousState: ActionResponse,
	formData: FormData,
): Promise<ActionResponse> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	const parsedFormData = schema.safeParse({
		translationId: Number(formData.get("translationId")),
	});
	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}
	const { translationId } = parsedFormData.data;
	await deleteOwnTranslation(currentUser.handle, translationId);
	revalidatePath(`/user/${currentUser.handle}/page/}`);
	return { success: true };
}
