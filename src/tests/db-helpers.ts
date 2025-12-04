import type { SegmentTypeKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * データベースをリセット（全テーブルをクリーンアップ）
 * 外部キー制約の順序に注意して削除
 */
export async function resetDatabase() {
	// 外部キー制約の順序に注意して削除
	await prisma.segmentAnnotationLink.deleteMany();
	await prisma.segmentMetadata.deleteMany();
	await prisma.translationVote.deleteMany();
	await prisma.segmentTranslation.deleteMany();
	await prisma.segment.deleteMany();
	await prisma.notification.deleteMany();
	await prisma.pageComment.deleteMany();
	await prisma.likePage.deleteMany();
	await prisma.tagPage.deleteMany();
	await prisma.translationJob.deleteMany();
	await prisma.pageLocaleTranslationProof.deleteMany();
	await prisma.pageView.deleteMany();
	await prisma.page.deleteMany();
	await prisma.content.deleteMany();
	await prisma.userSetting.deleteMany();
	await prisma.userCredential.deleteMany();
	await prisma.geminiApiKey.deleteMany();
	await prisma.follow.deleteMany();
	await prisma.account.deleteMany();
	await prisma.session.deleteMany();
	await prisma.user.deleteMany();
	// SegmentTypeとTagはマスターデータなので削除しない（グローバルで管理）
}

/**
 * マスターデータをセットアップ（SegmentType、SegmentMetadataTypeなど）
 * グローバルに1回だけ実行される想定
 */
export async function setupMasterData() {
	// SegmentTypeを取得または作成（既に存在する場合は更新しない）
	let primaryType = await prisma.segmentType.findFirst({
		where: { key: "PRIMARY" },
	});
	if (!primaryType) {
		primaryType = await prisma.segmentType.create({
			data: { key: "PRIMARY", label: "Primary" },
		});
	}

	let commentaryType = await prisma.segmentType.findFirst({
		where: { key: "COMMENTARY" },
	});
	if (!commentaryType) {
		commentaryType = await prisma.segmentType.create({
			data: { key: "COMMENTARY", label: "Commentary" },
		});
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

	await prisma.segmentMetadataType.createMany({
		data: metadataTypeSeedData,
		skipDuplicates: true,
	});

	return {
		primarySegmentTypeId: primaryType.id,
		commentarySegmentTypeId: commentaryType.id,
	};
}

/**
 * SegmentTypeのIDを取得（マスターデータから）
 */
export async function getSegmentTypeId(key: SegmentTypeKey): Promise<number> {
	const segmentType = await prisma.segmentType.findFirst({
		where: { key },
	});
	if (!segmentType) {
		throw new Error(
			`SegmentType with key "${key}" not found. Make sure setupMasterData() is called.`,
		);
	}
	return segmentType.id;
}
