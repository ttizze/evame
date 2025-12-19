import { db } from "@/db";

/**
 * ユーザーIDからGemini APIキーを取得
 * Kyselyに移行済み
 */
export async function fetchGeminiApiKeyByUserId(
	userId: string,
): Promise<string | null> {
	const result = await db
		.selectFrom("users")
		.innerJoin("geminiApiKeys", "users.id", "geminiApiKeys.userId")
		.select("geminiApiKeys.apiKey")
		.where("users.id", "=", userId)
		.executeTakeFirst();

	return result?.apiKey ?? null;
}

/**
 * ユーザーIDからプラン情報を取得
 */
export async function fetchUserPlanByUserId(
	userId: string,
): Promise<string | null> {
	const result = await db
		.selectFrom("users")
		.select("plan")
		.where("id", "=", userId)
		.executeTakeFirst();

	return result?.plan ?? null;
}
