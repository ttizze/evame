import { db } from "@/db";
import { encrypt } from "@/lib/encryption.server";

/**
 * Gemini APIキーを更新
 * Kysely版に移行済み
 */
export const updateGeminiApiKey = async (
	userId: string,
	geminiApiKey: string,
) => {
	const encryptedKey = encrypt(geminiApiKey);

	await db
		.insertInto("geminiApiKeys")
		.values({
			userId: userId,
			apiKey: encryptedKey,
		})
		.onConflict((oc) =>
			oc.column("userId").doUpdateSet({
				apiKey: encryptedKey,
			}),
		)
		.execute();
};
