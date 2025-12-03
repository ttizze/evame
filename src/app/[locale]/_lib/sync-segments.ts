import type { PrismaClient } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";

/**
 * Prismaのトランザクションクライアントの型
 */
type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * セグメントメタデータのドラフト型
 */
type MetadataDraft = {
	segmentId: number;
	items: Array<{ typeKey: string; value: string }>;
};

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

/**
 * SegmentDraft のメタデータを同期し、段落番号を使ってアノテーションリンクを作成する
 *
 * 処理の流れ:
 * 1. 各セグメントのメタデータを収集（段落番号も含める）
 * 2. 段落番号ごとにセグメントIDをグループ化
 * 3. メタデータをデータベースに同期
 * 4. 段落番号を使ってアノテーションリンクを作成
 */
export async function syncSegmentMetadataAndAnnotationLinks(
	tx: TransactionClient,
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
	contentId: number,
	anchorContentId?: number,
): Promise<void> {
	// 同期対象のセグメントIDのセット
	const segmentIds = new Set(hashToSegmentId.values());
	// メタデータドラフトのリスト
	const metadataDrafts: MetadataDraft[] = [];
	// 段落番号 → 注釈セグメントID配列のマッピング（アノテーションリンク作成用）
	const paragraphNumberToAnnotationSegmentIds = new Map<string, number[]>();

	// 各セグメントドラフトを処理
	for (const segment of segments) {
		const segmentId = hashToSegmentId.get(segment.textAndOccurrenceHash);
		if (!segmentId) {
			console.warn(
				`Segment for hash "${segment.textAndOccurrenceHash}" not found, skipping metadata`,
			);
			continue;
		}

		// 既存のメタデータアイテムを取得
		const items: Array<{ typeKey: string; value: string }> = [
			...(segment.metadata?.items ?? []),
		];

		// 段落番号がある場合はメタデータとして追加し、アノテーションリンク用のマッピングに追加
		if (segment.paragraphNumber) {
			items.push({
				typeKey: "VRI_PARAGRAPH",
				value: segment.paragraphNumber,
			});

			// 段落番号ごとにセグメントIDをグループ化
			const existing =
				paragraphNumberToAnnotationSegmentIds.get(segment.paragraphNumber) ??
				[];
			existing.push(segmentId);
			paragraphNumberToAnnotationSegmentIds.set(
				segment.paragraphNumber,
				existing,
			);
		}

		// メタデータアイテムがある場合のみドラフトに追加
		if (items.length > 0) {
			metadataDrafts.push({ segmentId, items });
		}
	}

	// メタデータを同期
	await syncSegmentMetadataDrafts(tx, segmentIds, metadataDrafts);

	// 段落番号がある場合、アノテーションリンクを作成
	if (paragraphNumberToAnnotationSegmentIds.size > 0) {
		await syncAnnotationLinksByParagraphNumber(
			tx,
			contentId,
			paragraphNumberToAnnotationSegmentIds,
			anchorContentId,
		);
	}
}

/**
 * セグメントの順序（number）を使ってアノテーションリンクを作成する
 *
 * 処理の流れ:
 * 1. 現在のコンテンツがCOMMENTARYタイプか確認
 * 2. 親ページのPRIMARYセグメントを取得（number順にソート）
 * 3. 注釈セグメントを取得（number順にソート）
 * 4. セグメントの順序（number）で対応させてリンクを作成
 */
async function syncAnnotationLinksByParagraphNumber(
	tx: TransactionClient,
	contentId: number,
	paragraphNumberToAnnotationSegmentIds: Map<string, number[]>,
	anchorContentId?: number,
): Promise<void> {
	// 現在のコンテンツのセグメントタイプを確認
	const currentSegmentType = await tx.segment.findFirst({
		where: { contentId },
		select: { segmentType: { select: { key: true } } },
	});

	// COMMENTARYタイプでない場合は処理を終了（アノテーションリンクはCOMMENTARYのみ）
	if (currentSegmentType?.segmentType.key !== "COMMENTARY") return;

	// 親ページのPRIMARYセグメントを取得（number順にソート）
	const primarySegments = await tx.segment.findMany({
		where: {
			contentId: anchorContentId,
		},
		select: {
			id: true,
			number: true,
		},
		orderBy: { number: "asc" },
	});

	// number → PRIMARYセグメントIDのマッピング
	const numberToPrimarySegmentId = new Map<number, number>();
	for (const segment of primarySegments) {
		numberToPrimarySegmentId.set(segment.number, segment.id);
	}

	// 注釈セグメントを取得（number順にソート）
	const annotationSegmentIds = Array.from(
		paragraphNumberToAnnotationSegmentIds.values(),
	).flat();

	if (annotationSegmentIds.length === 0) return;

	const annotationSegments = await tx.segment.findMany({
		where: { id: { in: annotationSegmentIds } },
		select: { id: true, number: true },
		orderBy: { number: "asc" },
	});

	// 既存のアノテーションリンクを削除
	await tx.segmentAnnotationLink.deleteMany({
		where: { annotationSegmentId: { in: annotationSegmentIds } },
	});

	// セグメントの順序（number）で対応させてリンクを作成
	const linksToCreate: Array<{
		mainSegmentId: number;
		annotationSegmentId: number;
	}> = [];

	for (const annotationSegment of annotationSegments) {
		const primarySegmentId = numberToPrimarySegmentId.get(
			annotationSegment.number,
		);
		if (primarySegmentId) {
			linksToCreate.push({
				mainSegmentId: primarySegmentId,
				annotationSegmentId: annotationSegment.id,
			});
		}
	}

	// アノテーションリンクを作成
	if (linksToCreate.length > 0) {
		await tx.segmentAnnotationLink.createMany({
			data: linksToCreate,
			skipDuplicates: true,
		});
	}
}

/**
 * SegmentMetadataDraft をデータベースに同期する
 *
 * 処理の流れ:
 * 1. 使用されているメタデータタイプのキーを収集
 * 2. メタデータタイプを取得または作成
 * 3. メタデータアイテムを作成するデータを収集
 * 4. 既存のメタデータを削除
 * 5. 新しいメタデータを作成
 */
async function syncSegmentMetadataDrafts(
	tx: TransactionClient,
	segmentIds: Set<number>,
	metadataDrafts: MetadataDraft[],
): Promise<void> {
	// 使用されているメタデータタイプのキーを収集
	const metadataTypeKeys = new Set<string>();
	for (const draft of metadataDrafts) {
		for (const item of draft.items) {
			metadataTypeKeys.add(item.typeKey);
		}
	}

	// メタデータタイプのキー → IDのマッピングを構築
	const metadataTypeMap = new Map<string, number>();
	if (metadataTypeKeys.size > 0) {
		// 既存のメタデータタイプを取得
		const existingTypes = await tx.segmentMetadataType.findMany({
			select: { key: true, id: true },
			where: { key: { in: [...metadataTypeKeys] } },
		});
		for (const mt of existingTypes) {
			metadataTypeMap.set(mt.key, mt.id);
		}

		// 存在しないメタデータタイプを自動作成
		for (const key of metadataTypeKeys) {
			if (!metadataTypeMap.has(key)) {
				const created = await tx.segmentMetadataType.create({
					data: { key, label: key },
				});
				metadataTypeMap.set(key, created.id);
			}
		}
	}

	// 作成するメタデータアイテムを収集
	const metadataToCreate: Array<{
		segmentId: number;
		metadataTypeId: number;
		value: string;
	}> = [];

	for (const draft of metadataDrafts) {
		// セグメントIDが有効か確認
		if (!segmentIds.has(draft.segmentId)) {
			console.warn(
				`Segment ID ${draft.segmentId} not found in segmentIds, skipping metadata`,
			);
			continue;
		}

		// 各メタデータアイテムを作成データに追加
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

	// 既存のメタデータを削除（同期対象のセグメントの全てのメタデータを削除）
	if (segmentIds.size > 0) {
		await tx.segmentMetadata.deleteMany({
			where: { segmentId: { in: [...segmentIds] } },
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
