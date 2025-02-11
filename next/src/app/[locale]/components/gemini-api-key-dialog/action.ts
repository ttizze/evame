"use server";
import type { ActionResponse } from "@/app/types";
import { auth } from "@/auth";
import { validateGeminiApiKey } from "@/features/translate/services/gemini";
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
	const session = await auth();
	const currentUser = session?.user;
	if (!currentUser || !currentUser.id) {
		redirect("/auth/signin");
	}
	const validation = geminiApiKeySchema.safeParse({
		geminiApiKey: formData.get("geminiApiKey"),
	});

	if (!validation.success) {
		return {
			success: false,
			zodErrors: validation.error.flatten().fieldErrors,
		};
	}

	const { geminiApiKey } = validation.data;

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
	return { success: true, message: "Gemini API key updated successfully" };
}
