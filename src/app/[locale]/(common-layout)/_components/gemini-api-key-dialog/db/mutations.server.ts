import { encrypt } from "@/app/_service/encryption.server";
import { db } from "@/db";

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
