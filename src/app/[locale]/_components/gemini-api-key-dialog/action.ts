"use server";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";
import { validateGeminiApiKey } from "@/features/translate/services/gemini";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateGeminiApiKey } from "./db/mutations.server";
const geminiApiKeySchema = z.object({
	geminiApiKey: z.string(),
});
export type GeminiApiKeyDialogState = ActionResponse<
	undefined,
	{
		geminiApiKey: string;
	}
>;
export async function updateGeminiApiKeyAction(
	previousState: GeminiApiKeyDialogState,
	formData: FormData,
): Promise<GeminiApiKeyDialogState> {
	const v = await authAndValidate(geminiApiKeySchema, formData);
	if (!v.success) {
		return {
			success: false,
			zodErrors: v.zodErrors,
		};
	}
	const { currentUser, data } = v;
	const { geminiApiKey } = data;

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
	return {
		success: true,
		data: undefined,
		message: "Gemini API key updated successfully",
	};
}
