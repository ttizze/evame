import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { z } from "zod";
import { deleteOwnTranslation } from "./db/mutations.server";
const schema = z.object({
	translationId: z.number(),
});

export async function deleteTranslationAction(
	previousState: ActionState,
	formData: FormData,
) {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		return { error: "Unauthorized" };
	}
	const translationId = Number.parseInt(
		formData.get("translationId") as string,
	);
	const validation = schema.safeParse({ translationId });
	if (!validation.success) {
		return { error: "Invalid translationId" };
	}
	await deleteOwnTranslation(currentUser.handle, validation.data.translationId);
	return { success: "Translation deleted successfully" };
}
