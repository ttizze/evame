import type { PrismaClient } from "@prisma/client";
import { SegmentLocatorSystem } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

const SEGMENT_UPSERT_CHUNK_SIZE = 200;
const SEGMENT_LOCATOR_LINK_CHUNK_SIZE = 1_000;
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
 * SegmentDraft のメタデータとロケーターを同期する
 *
 * @param hashToSegmentId syncSegments の戻り値
 * @param segments セグメントドラフト（メタデータとロケーターを含む）
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

	// ロケータードラフトを収集
	const locatorDrafts: Array<{
		segmentId: number;
		system: "VRI_PARAGRAPH";
		value: string;
	}> = [];

	for (const segment of segments) {
		const segmentId = hashToSegmentId.get(segment.textAndOccurrenceHash);
		if (!segmentId) {
			console.warn(
				`Segment for hash "${segment.textAndOccurrenceHash}" not found, skipping metadata and locators`,
			);
			continue;
		}

		if (segment.metadata) {
			metadataDrafts.push({
				segmentId,
				items: segment.metadata.items,
			});
		}

		if (segment.locators) {
			for (const locator of segment.locators) {
				locatorDrafts.push({
					segmentId,
					system: locator.system,
					value: locator.value,
				});
			}
		}
	}

	await syncSegmentMetadataDrafts(tx, segmentIds, metadataDrafts);
	await syncLocatorsAndLinks(tx, contentId, locatorDrafts);
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

/**
 * SegmentLocatorDraft を同期する（本文/注釈 共通のシンプルなフロー）
 *
 * 目的:
 * - contentId の VRI_PARAGRAPH ロケーター集合を、渡された values のみに収束
 *   1) 足りないロケーターを作成、余計なロケーターを削除
 *   2) ロケーターとセグメントのリンクを差分同期（不要削除・不足作成）
 *
 * @param locatorDrafts セグメントIDとロケーターのペア（system は VRI_PARAGRAPH 前提）
 */
async function syncLocatorsAndLinks(
	tx: TransactionClient,
	contentId: number,
	locatorDrafts: Array<{
		segmentId: number;
		system: keyof typeof SegmentLocatorSystem;
		value: string;
	}>,
	system: SegmentLocatorSystem = SegmentLocatorSystem.VRI_PARAGRAPH,
): Promise<void> {
	// 1) ロケータ集合を同期し、value -> id マップを取得（抽出は関数内で実施）
	const locatorIdByValue = await ensureLocatorsForSystem(
		tx,
		contentId,
		locatorDrafts,
		system,
	);
	if (locatorIdByValue.size === 0) return;

	// 3) 望ましいリンク集合を構築（locatorId -> segmentIds）
	const locatorIdToSegmentIds = buildLocatorIdToSegmentIds(
		locatorDrafts,
		locatorIdByValue,
		system,
	);
	if (locatorIdToSegmentIds.size === 0) return;

	// 4) リンクを置き換え
	await replaceLinksForLocators(tx, locatorIdToSegmentIds);
}

// --- helpers (関心分離) ---

async function ensureLocatorsForSystem(
	tx: TransactionClient,
	contentId: number,
	drafts: Array<{
		segmentId: number;
		system: keyof typeof SegmentLocatorSystem;
		value: string;
	}>,
	system: SegmentLocatorSystem,
): Promise<Map<string, number>> {
	// 対象 drafts のユニークな value を抽出
	const uniqueValues = [
		...new Set(
			drafts
				.filter((d) => d.system === system && Boolean(d.value))
				.map((d) => d.value),
		),
	];

	// 値が空の場合は、その contentId/system のロケーターを全削除し、空マップを返す
	if (uniqueValues.length === 0) {
		await tx.segmentLocator.deleteMany({ where: { contentId, system } });
		return new Map();
	}

	await tx.segmentLocator.deleteMany({
		where: {
			contentId,
			system,
			value: { notIn: uniqueValues },
		},
	});
	await tx.segmentLocator.createMany({
		data: uniqueValues.map((value) => ({
			contentId,
			system,
			value,
		})),
		skipDuplicates: true,
	});
	const locators = await tx.segmentLocator.findMany({
		where: {
			contentId,
			system,
			value: { in: uniqueValues },
		},
		select: { id: true, value: true },
	});
	return new Map(locators.map((l) => [l.value, l.id]));
}

/**
 * locatorId -> segmentIds の対応を構築する
 */
function buildLocatorIdToSegmentIds(
	drafts: Array<{
		segmentId: number;
		system: keyof typeof SegmentLocatorSystem;
		value: string;
	}>,
	locatorIdByValue: Map<string, number>,
	system: SegmentLocatorSystem,
): Map<number, Set<number>> {
	const map = new Map<number, Set<number>>();
	for (const d of drafts) {
		if (d.system !== system) continue;
		if (!d.value) continue;
		const locatorId = locatorIdByValue.get(d.value);
		if (!locatorId) continue;
		let set = map.get(locatorId);
		if (!set) {
			set = new Set<number>();
			map.set(locatorId, set);
		}
		set.add(d.segmentId);
	}
	return map;
}
async function replaceLinksForLocators(
	tx: TransactionClient,
	locatorIdToSegmentIds: Map<number, Set<number>>,
): Promise<void> {
	const locatorIds = [...locatorIdToSegmentIds.keys()];
	await tx.segmentLocatorLink.deleteMany({
		where: { segmentLocatorId: { in: locatorIds } },
	});
	const linkData: Array<{ segmentLocatorId: number; segmentId: number }> = [];
	for (const [locatorId, segSet] of locatorIdToSegmentIds) {
		for (const segId of segSet)
			linkData.push({ segmentLocatorId: locatorId, segmentId: segId });
	}
	if (linkData.length === 0) return;
	for (let i = 0; i < linkData.length; i += SEGMENT_LOCATOR_LINK_CHUNK_SIZE) {
		const chunk = linkData.slice(i, i + SEGMENT_LOCATOR_LINK_CHUNK_SIZE);
		await tx.segmentLocatorLink.createMany({
			data: chunk,
			skipDuplicates: true,
		});
	}
}
