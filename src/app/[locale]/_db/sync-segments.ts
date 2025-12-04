import type { PrismaClient } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";

/**
 * Prismaのトランザクションクライアントの型
 */
type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * セグメントのupsert処理を実行する際のバッチサイズ
 */
const SEGMENT_UPSERT_CHUNK_SIZE = 200;

/**
 * 既存セグメントの番号を一時的にオフセットする際に使用する値
 * 重複を回避するために大きな値を加算する
 */
const NUMBER_OFFSET_FOR_REORDERING = 1_000_000;

/**
 * セグメントをupsertで同期する（トランザクション内で呼ぶこと）
 *
 * 処理の流れ:
 * 1. 既存セグメントの番号を一時的にオフセットして重複を回避
 * 2. ドラフトをバッチでupsert
 * 3. ドラフトに含まれない既存セグメントを削除
 */
export async function syncSegments(
	tx: TransactionClient,
	contentId: number,
	drafts: SegmentDraft[],
	segmentTypeId?: number,
): Promise<Map<string, number>> {
	// セグメントタイプIDを取得（指定されていない場合はPRIMARYをデフォルトとして使用）
	const typeId =
		segmentTypeId ??
		(await tx.segmentType.findFirst({ where: { key: "PRIMARY" } }))?.id;

	if (!typeId) {
		throw new Error("Primary segment type not found");
	}

	// 既存のセグメントを取得（ハッシュのみ）
	const existing = await tx.segment.findMany({
		where: { contentId, segmentTypeId: typeId },
		select: { textAndOccurrenceHash: true },
	});
	// 既存セグメントのハッシュをセットとして保持（削除対象の判定に使用）
	const staleHashes = new Set(existing.map((e) => e.textAndOccurrenceHash));

	// 既存セグメントの番号を一時的にオフセットして重複を回避
	if (existing.length > 0) {
		await tx.segment.updateMany({
			where: { contentId, segmentTypeId: typeId },
			data: { number: { increment: NUMBER_OFFSET_FOR_REORDERING } },
		});
	}

	// ハッシュ → セグメントIDのマッピング（戻り値として使用）
	const hashToSegmentId = new Map<string, number>();

	// ドラフトをバッチサイズごとに分割してupsert処理を実行
	for (let i = 0; i < drafts.length; i += SEGMENT_UPSERT_CHUNK_SIZE) {
		const chunk = drafts.slice(i, i + SEGMENT_UPSERT_CHUNK_SIZE);
		const results = await Promise.all(
			chunk.map(async (draft) => {
				// セグメントをupsert（存在すれば更新、存在しなければ作成）
				const segment = await tx.segment.upsert({
					where: {
						contentId_textAndOccurrenceHash: {
							contentId,
							textAndOccurrenceHash: draft.textAndOccurrenceHash,
						},
					},
					update: { text: draft.text, number: draft.number },
					create: {
						contentId,
						text: draft.text,
						number: draft.number,
						textAndOccurrenceHash: draft.textAndOccurrenceHash,
						segmentTypeId: typeId,
					},
					select: { id: true },
				});

				return {
					hash: draft.textAndOccurrenceHash,
					segmentId: segment.id,
				};
			}),
		);

		// 結果をマッピングに追加し、削除対象から除外
		for (const { hash, segmentId } of results) {
			hashToSegmentId.set(hash, segmentId);
			staleHashes.delete(hash);
		}
	}

	// ドラフトに含まれない既存セグメントを削除
	if (staleHashes.size > 0) {
		await tx.segment.deleteMany({
			where: {
				contentId,
				segmentTypeId: typeId,
				textAndOccurrenceHash: { in: [...staleHashes] },
			},
		});
	}

	return hashToSegmentId;
}
