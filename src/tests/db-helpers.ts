import { eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	accounts,
	contents,
	follows,
	geminiApiKeys,
	likePages,
	notifications,
	pageComments,
	pageLocaleTranslationProofs,
	pages,
	pageViews,
	segmentAnnotationLinks,
	segmentMetadata,
	segmentMetadataTypes,
	segments,
	segmentTranslations,
	segmentTypes,
	sessions,
	tagPages,
	translationJobs,
	translationVotes,
	userCredentials,
	userSettings,
	users,
} from "@/drizzle/schema";
import type { SegmentTypeKey } from "@/drizzle/types";

/**
 * データベースをリセット（全テーブルをクリーンアップ）
 * 外部キー制約の順序に注意して削除
 */
export async function resetDatabase() {
	// 外部キー制約の順序に注意して削除
	await db.delete(segmentAnnotationLinks);
	await db.delete(segmentMetadata);
	await db.delete(translationVotes);
	await db.delete(segmentTranslations);
	await db.delete(segments);
	await db.delete(notifications);
	await db.delete(pageComments);
	await db.delete(likePages);
	await db.delete(tagPages);
	await db.delete(translationJobs);
	await db.delete(pageLocaleTranslationProofs);
	await db.delete(pageViews);
	await db.delete(pages);
	await db.delete(contents);
	await db.delete(userSettings);
	await db.delete(userCredentials);
	await db.delete(geminiApiKeys);
	await db.delete(follows);
	await db.delete(accounts);
	await db.delete(sessions);
	await db.delete(users);
	// SegmentTypeとTagはマスターデータなので削除しない（グローバルで管理）
}

/**
 * マスターデータをセットアップ（SegmentType、SegmentMetadataTypeなど）
 * グローバルに1回だけ実行される想定
 */
export async function setupMasterData() {
	// SegmentTypeを取得または作成（既に存在する場合は更新しない）
	const [primaryType] = await db
		.select()
		.from(segmentTypes)
		.where(eq(segmentTypes.key, "PRIMARY"))
		.limit(1);

	let primarySegmentTypeId: number;
	if (!primaryType) {
		const [inserted] = await db
			.insert(segmentTypes)
			.values({ key: "PRIMARY", label: "Primary" })
			.returning();
		primarySegmentTypeId = inserted.id;
	} else {
		primarySegmentTypeId = primaryType.id;
	}

	const [commentaryType] = await db
		.select()
		.from(segmentTypes)
		.where(eq(segmentTypes.key, "COMMENTARY"))
		.limit(1);

	let commentarySegmentTypeId: number;
	if (!commentaryType) {
		const [inserted] = await db
			.insert(segmentTypes)
			.values({ key: "COMMENTARY", label: "Commentary" })
			.returning();
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
		const [existing] = await db
			.select()
			.from(segmentMetadataTypes)
			.where(eq(segmentMetadataTypes.key, data.key))
			.limit(1);
		if (!existing) {
			await db.insert(segmentMetadataTypes).values(data);
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
	const [segmentType] = await db
		.select()
		.from(segmentTypes)
		.where(eq(segmentTypes.key, key))
		.limit(1);
	if (!segmentType) {
		throw new Error(
			`SegmentType with key "${key}" not found. Make sure setupMasterData() is called.`,
		);
	}
	return segmentType.id;
}
