import { db } from "@/db/kysely";
import { encrypt } from "@/lib/encryption.server";

export const updateGeminiApiKey = async (
	userId: string,
	geminiApiKey: string,
) => {
	const encryptedKey = encrypt(geminiApiKey);

	// Kysely の onConflict を使って upsert を実装
	await db
		.insertInto("geminiApiKeys")
		.values({
			userId,
			apiKey: encryptedKey,
		})
		.onConflict((oc) =>
			oc.column("userId").doUpdateSet({
				apiKey: encryptedKey,
			}),
		)
		.execute();
};
