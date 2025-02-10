"use server";
import type { ActionState } from "@/app/types";
import { auth } from "@/auth";
import { validateGeminiApiKey } from "@/features/translate/services/gemini";
import { z } from "zod";
import { updateGeminiApiKey } from "./db/mutations.server";

const geminiApiKeySchema = z.object({
	geminiApiKey: z.string(),
});
export type GeminiApiKeyDialogState = ActionState & {
	fieldErrors?: {
		geminiApiKey: string;
	};
};
export async function updateGeminiApiKeyAction(
	previousState: GeminiApiKeyDialogState,
	formData: FormData,
): Promise<GeminiApiKeyDialogState> {
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		return {
			fieldErrors: {
				geminiApiKey: "Unauthorized",
			},
		};
	}
	const validation = geminiApiKeySchema.safeParse({
		geminiApiKey: formData.get("geminiApiKey"),
	});

	if (!validation.success) {
		return {
			fieldErrors: {
				geminiApiKey: "Invalid input",
			},
		};
	}

	const { geminiApiKey } = validation.data;

	if (geminiApiKey && geminiApiKey.trim() !== "") {
		const { isValid, errorMessage } = await validateGeminiApiKey(geminiApiKey);
		if (!isValid) {
			return {
				fieldErrors: {
					geminiApiKey: errorMessage || "Gemini API key validation failed",
				},
			};
		}
	}
	await updateGeminiApiKey(currentUser.id, geminiApiKey);
	return { success: true, message: "Gemini API key updated successfully" };
}
