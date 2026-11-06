import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { updateGeminiApiKey } from "@/app/[locale]/(common-layout)/_components/gemini-api-key-dialog/db/mutations.server";
import { validateGeminiApiKey } from "@/app/api/translate/chunk/_infra/gemini";
import type { ActionResponse } from "@/app/types";

const geminiApiKeySchema = z.object({
	geminiApiKey: z.string(),
});

export type GeminiApiKeyDialogState = ActionResponse<
	undefined,
	{ geminiApiKey: string }
>;

export async function updateGeminiApiKeyAction(
	input: z.input<typeof geminiApiKeySchema>,
	requestHeaders: Headers,
): Promise<GeminiApiKeyDialogState> {
	const data = geminiApiKeySchema.parse(input);
	const currentUser = await getCurrentUserFromHeaders(requestHeaders);
	if (!currentUser) {
		throw new Response(null, { status: 401 });
	}
	const { geminiApiKey } = data;
	if (geminiApiKey.trim() !== "") {
		const { isValid, errorMessage } = await validateGeminiApiKey(geminiApiKey);
		if (!isValid) {
			return {
				success: false,
				message: errorMessage || "Gemini API key validation failed",
			};
		}
	}
	await updateGeminiApiKey(currentUser.id, geminiApiKey);
	return {
		success: true,
		data: undefined,
		message: "Gemini API key updated successfully",
	};
}
