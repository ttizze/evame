import { db } from "@/db";

/**
 * データベースをリセット（全テーブルをクリーンアップ）
 * 外部キー制約の順序に注意して削除
 */
export async function resetDatabase() {
	// 外部キー制約の順序に注意して削除
	await db.deleteFrom("translationVotes").execute();
	await db.deleteFrom("segmentTranslations").execute();
	await db.deleteFrom("segments").execute();
	await db.deleteFrom("notifications").execute();
	await db.deleteFrom("pageComments").execute();
	await db.deleteFrom("likePages").execute();
	await db.deleteFrom("tagPages").execute();
	await db.deleteFrom("translationJobs").execute();
	await db.deleteFrom("pageLocaleTranslationProofs").execute();
	await db.deleteFrom("pageViews").execute();
	await db.deleteFrom("pages").execute();
	await db.deleteFrom("contents").execute();
	await db.deleteFrom("userSettings").execute();
	await db.deleteFrom("geminiApiKeys").execute();
	await db.deleteFrom("personalAccessTokens").execute();
	await db.deleteFrom("follows").execute();
	await db.deleteFrom("accounts").execute();
	await db.deleteFrom("sessions").execute();
	await db.deleteFrom("users").execute();
	// タグはマスターデータとして残す。
}
