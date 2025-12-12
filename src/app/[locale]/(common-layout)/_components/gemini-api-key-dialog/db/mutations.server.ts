import { db } from "@/drizzle";
import { geminiApiKeys } from "@/drizzle/schema";
import { encrypt } from "@/lib/encryption.server";

/**
 * Gemini APIキーを更新
 * Drizzle版に移行済み
 */
export const updateGeminiApiKey = async (
	userId: string,
	geminiApiKey: string,
) => {
	const encryptedKey = encrypt(geminiApiKey);

	await db
		.insert(geminiApiKeys)
		.values({
			userId: userId,
			apiKey: encryptedKey,
		})
		.onConflictDoUpdate({
			target: [geminiApiKeys.userId],
			set: {
				apiKey: encryptedKey,
			},
		});
};
