"use server";
import type { ActionState } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteOwnTranslation } from "./db/mutations.server";
import { redirect } from "next/navigation";
const schema = z.object({
	translationId: z.number(),
});

export async function deleteTranslationAction(
	previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const currentUser = await getCurrentUser();
	if (!currentUser || !currentUser.id) {
		redirect("/auth/login");
	}
	const translationId = Number.parseInt(
		formData.get("translationId") as string,
	);
	const validation = schema.safeParse({ translationId });
	if (!validation.success) {
		return { success: false, error: "Invalid translationId" };
	}
	await deleteOwnTranslation(currentUser.handle, validation.data.translationId);
	revalidatePath(`/user/${currentUser.handle}/page/`);
	return { success: true };
}
