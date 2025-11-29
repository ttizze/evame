import type { PrismaClient } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

const SEGMENT_UPSERT_CHUNK_SIZE = 200;
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
	const typeId =
		segmentTypeId ??
		(await tx.segmentType.findUnique({ where: { key: "PRIMARY" } }))?.id;

	if (!typeId) {
		throw new Error("Primary segment type not found");
	}

	const existing = await tx.segment.findMany({
		where: { contentId, segmentTypeId: typeId },
		select: { textAndOccurrenceHash: true },
	});
	const staleHashes = new Set(existing.map((e) => e.textAndOccurrenceHash));

	// 既存セグメントの番号を一時的にオフセットして重複を回避
	if (existing.length > 0) {
		await tx.segment.updateMany({
			where: { contentId, segmentTypeId: typeId },
			data: { number: { increment: NUMBER_OFFSET_FOR_REORDERING } },
		});
	}

	const hashToSegmentId = new Map<string, number>();

	// ドラフトをバッチでupsert
	for (let i = 0; i < drafts.length; i += SEGMENT_UPSERT_CHUNK_SIZE) {
		const chunk = drafts.slice(i, i + SEGMENT_UPSERT_CHUNK_SIZE);
		const results = await Promise.all(
			chunk.map(async (draft) => {
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

/**
 * SegmentDraft のメタデータを同期する
 *
 * @param hashToSegmentId syncSegments の戻り値
 * @param segments セグメントドラフト（メタデータを含む）
 */
export async function syncSegmentMetadataAndLocators(
	tx: TransactionClient,
	contentId: number,
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
): Promise<void> {
	const segmentIds = new Set(hashToSegmentId.values());

	// メタデータドラフトを収集
	const metadataDrafts: Array<{
		segmentId: number;
		items: Array<{ typeKey: string; value: string }>;
	}> = [];

	for (const segment of segments) {
		const segmentId = hashToSegmentId.get(segment.textAndOccurrenceHash);
		if (!segmentId) {
			console.warn(
				`Segment for hash "${segment.textAndOccurrenceHash}" not found, skipping metadata`,
			);
			continue;
		}

		if (segment.metadata) {
			metadataDrafts.push({
				segmentId,
				items: segment.metadata.items,
			});
		}
	}

	await syncSegmentMetadataDrafts(tx, segmentIds, metadataDrafts);
}

/**
 * SegmentMetadataDraft を同期する
 *
 * @param segmentIds 同期対象のセグメントIDのセット
 * @param metadataDrafts セグメントIDとメタデータのペア
 */
async function syncSegmentMetadataDrafts(
	tx: TransactionClient,
	segmentIds: Set<number>,
	metadataDrafts: Array<{
		segmentId: number;
		items: Array<{ typeKey: string; value: string }>;
	}>,
): Promise<void> {
	const segmentIdsToClear = new Set(segmentIds);

	// メタデータタイプのキーを収集
	const metadataTypeKeys = new Set<string>();
	for (const draft of metadataDrafts) {
		for (const item of draft.items) {
			metadataTypeKeys.add(item.typeKey);
		}
	}

	// メタデータタイプのマップを構築
	const metadataTypeMap =
		metadataTypeKeys.size > 0
			? new Map(
					(
						await tx.segmentMetadataType.findMany({
							select: { key: true, id: true },
							where: { key: { in: [...metadataTypeKeys] } },
						})
					).map((mt) => [mt.key, mt.id]),
				)
			: new Map<string, number>();

	// 作成するメタデータを収集
	const metadataToCreate: Array<{
		segmentId: number;
		metadataTypeId: number;
		value: string;
	}> = [];

	for (const draft of metadataDrafts) {
		if (!segmentIds.has(draft.segmentId)) {
			console.warn(
				`Segment ID ${draft.segmentId} not found in segmentIds, skipping metadata`,
			);
			continue;
		}

		for (const item of draft.items) {
			const metadataTypeId = metadataTypeMap.get(item.typeKey);
			if (!metadataTypeId) {
				console.warn(
					`Metadata type "${item.typeKey}" not found, skipping segment metadata`,
				);
				continue;
			}
			metadataToCreate.push({
				segmentId: draft.segmentId,
				metadataTypeId,
				value: item.value,
			});
		}
	}

	// 既存メタデータを削除
	if (segmentIdsToClear.size > 0) {
		await tx.segmentMetadata.deleteMany({
			where: { segmentId: { in: [...segmentIdsToClear] } },
		});
	}

	// 新しいメタデータを作成
	if (metadataToCreate.length > 0) {
		await tx.segmentMetadata.createMany({
			data: metadataToCreate,
			skipDuplicates: true,
		});
	}
}

