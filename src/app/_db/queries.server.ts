import { db } from "@/db";

/**
 * handleからユーザーを取得
 * Kyselyに移行済み
 */
export async function fetchUserByHandle(handle: string) {
	const result = await db
		.selectFrom("users")
		.selectAll()
		.where("handle", "=", handle)
		.executeTakeFirst();
	return result ?? null;
}

/**
 * ユーザーの翻訳先の言語を取得する。Webの編集画面とアプリの公開で同じ設定を使い、未設定なら英語と中国語にする。
 */
export async function getUserTargetLocales(userId: string) {
	const result = await db
		.selectFrom("userSettings")
		.select("targetLocales")
		.where("userId", "=", userId)
		.executeTakeFirst();
	return result?.targetLocales.length ? result.targetLocales : ["en", "zh"];
}
