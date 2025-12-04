import type { PrismaClient } from "@prisma/client";
import { createServerLogger } from "@/lib/logger.server";
import type { MetadataDraft } from "../domain/collect-metadata-drafts";

/**
 * Prismaのトランザクションクライアントの型
 */
type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

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
export async function syncSegmentMetadata(
	tx: TransactionClient,
	segmentIds: Set<number>,
	metadataDrafts: MetadataDraft[],
): Promise<void> {
	const logger = createServerLogger("sync-segment-metadata", {
		segmentCount: segmentIds.size,
	});

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
			logger.warn(
				{ segmentId: draft.segmentId },
				"Segment ID not found in segmentIds, skipping metadata",
			);
			continue;
		}

		// 各メタデータアイテムを作成データに追加
		for (const item of draft.items) {
			const metadataTypeId = metadataTypeMap.get(item.typeKey);
			if (!metadataTypeId) {
				logger.warn(
					{ typeKey: item.typeKey, segmentId: draft.segmentId },
					"Metadata type not found, skipping segment metadata",
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
