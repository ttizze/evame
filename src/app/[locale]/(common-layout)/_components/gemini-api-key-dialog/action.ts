import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import type { ActionResponse } from "@/app/types";

const geminiApiKeySchema = z.object({
	geminiApiKey: z.string(),
});

export type GeminiApiKeyDialogState = ActionResponse<
	undefined,
	{ geminiApiKey: string }
>;

export const updateGeminiApiKeyAction = createServerFn({ method: "POST" })
	.validator(geminiApiKeySchema)
	.handler(async ({ data }): Promise<GeminiApiKeyDialogState> => {
		const [
			{ getCurrentUserFromHeaders },
			{ validateGeminiApiKey },
			{ updateGeminiApiKey },
		] = await Promise.all([
			import("@/app/_service/current-user"),
			import("@/app/api/translate/chunk/_infra/gemini"),
			import("./db/mutations.server"),
		]);
		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser) {
			return { success: false, message: "Unauthorized" };
		}
		const { geminiApiKey } = data;
		if (geminiApiKey.trim() !== "") {
			const { isValid, errorMessage } =
				await validateGeminiApiKey(geminiApiKey);
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
	});
