"use server";
import { z } from "zod";
import { revalidateAllLocales } from "@/app/_service/revalidate-utils";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { validateGeminiApiKey } from "@/app/api/translate/chunk/_infra/gemini";
import type { ActionResponse } from "@/app/types";
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
	_previousState: GeminiApiKeyDialogState,
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
	revalidateAllLocales("/");
	return {
		success: true,
		data: undefined,
		message: "Gemini API key updated successfully",
	};
}
