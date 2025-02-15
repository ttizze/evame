"use server";
import type { ActionResponse } from "@/app/types";
import { getCurrentUser } from "@/auth";
import { validateGeminiApiKey } from "@/features/translate/services/gemini";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { updateGeminiApiKey } from "./db/mutations.server";
const geminiApiKeySchema = z.object({
	geminiApiKey: z.string(),
});
export type GeminiApiKeyDialogState = ActionResponse<
	void,
	{
		geminiApiKey: string;
	}
>;
export async function updateGeminiApiKeyAction(
	previousState: GeminiApiKeyDialogState,
	formData: FormData,
): Promise<GeminiApiKeyDialogState> {
	const currentUser = await getCurrentUser();
	if (!currentUser?.id) {
		return redirect("/auth/login");
	}
	const parsedFormData = geminiApiKeySchema.safeParse({
		geminiApiKey: formData.get("geminiApiKey"),
	});

	if (!parsedFormData.success) {
		return {
			success: false,
			zodErrors: parsedFormData.error.flatten().fieldErrors,
		};
	}

	const { geminiApiKey } = parsedFormData.data;

	if (geminiApiKey && geminiApiKey.trim() !== "") {
		const { isValid, errorMessage } = await validateGeminiApiKey(geminiApiKey);
		if (!isValid) {
			return {
				success: false,
				message: errorMessage || "Gemini API key validation failed",
			};
		}
	}
	await updateGeminiApiKey(currentUser.id, geminiApiKey);
	revalidatePath("/");
	return { success: true, message: "Gemini API key updated successfully" };
}
