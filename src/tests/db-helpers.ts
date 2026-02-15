import { db } from "@/db";
import type { SegmentTypeKey } from "@/db/types";

/**
 * データベースをリセット（全テーブルをクリーンアップ）
 * 外部キー制約の順序に注意して削除
 */
export async function resetDatabase() {
	// 外部キー制約の順序に注意して削除
	await db.deleteFrom("segmentAnnotationLinks").execute();
	await db.deleteFrom("segmentMetadata").execute();
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
	// SegmentTypeとTagはマスターデータなので削除しない（グローバルで管理）
}

/**
 * マスターデータをセットアップ（SegmentType、SegmentMetadataTypeなど）
 * グローバルに1回だけ実行される想定
 */
export async function setupMasterData() {
	// SegmentTypeを取得または作成（既に存在する場合は更新しない）
	const primaryType = await db
		.selectFrom("segmentTypes")
		.selectAll()
		.where("key", "=", "PRIMARY")
		.executeTakeFirst();

	let primarySegmentTypeId: number;
	if (!primaryType) {
		const inserted = await db
			.insertInto("segmentTypes")
			.values({ key: "PRIMARY", label: "Primary" })
			.returning(["id"])
			.executeTakeFirstOrThrow();
		primarySegmentTypeId = inserted.id;
	} else {
		primarySegmentTypeId = primaryType.id;
	}

	const commentaryType = await db
		.selectFrom("segmentTypes")
		.selectAll()
		.where("key", "=", "COMMENTARY")
		.executeTakeFirst();

	let commentarySegmentTypeId: number;
	if (!commentaryType) {
		const inserted = await db
			.insertInto("segmentTypes")
			.values({ key: "COMMENTARY", label: "Commentary" })
			.returning(["id"])
			.executeTakeFirstOrThrow();
		commentarySegmentTypeId = inserted.id;
	} else {
		commentarySegmentTypeId = commentaryType.id;
	}

	// SegmentMetadataTypeを取得または作成
	const metadataTypeSeedData = [
		{ key: "VRI_PAGEBREAK", label: "VRI Page Break" },
		{ key: "PTS_PAGEBREAK", label: "PTS Page Break" },
		{ key: "THAI_PAGEBREAK", label: "Thai Page Break" },
		{ key: "MYANMAR_PAGEBREAK", label: "Myanmar Page Break" },
		{ key: "OTHER_PAGEBREAK", label: "Other Page Break" },
		{ key: "PARAGRAPH_NUMBER", label: "Paragraph Number" },
	];

	// skipDuplicates相当の処理: 既存のkeyを確認してから挿入
	for (const data of metadataTypeSeedData) {
		const existing = await db
			.selectFrom("segmentMetadataTypes")
			.selectAll()
			.where("key", "=", data.key)
			.executeTakeFirst();
		if (!existing) {
			await db.insertInto("segmentMetadataTypes").values(data).execute();
		}
	}

	return {
		primarySegmentTypeId,
		commentarySegmentTypeId,
	};
}

/**
 * SegmentTypeのIDを取得（マスターデータから）
 */
export async function getSegmentTypeId(key: SegmentTypeKey): Promise<number> {
	const segmentType = await db
		.selectFrom("segmentTypes")
		.selectAll()
		.where("key", "=", key)
		.executeTakeFirst();
	if (!segmentType) {
		throw new Error(
			`SegmentType with key "${key}" not found. Make sure setupMasterData() is called.`,
		);
	}
	return segmentType.id;
}
