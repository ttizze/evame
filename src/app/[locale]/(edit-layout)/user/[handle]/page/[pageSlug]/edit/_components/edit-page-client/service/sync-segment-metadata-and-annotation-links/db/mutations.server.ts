import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { createServerLogger } from "@/lib/logger.server";
import type { MetadataDraft } from "../domain/collect-metadata-drafts";

/**
 * SegmentMetadataDraft をデータベースに同期する
 *
 * 処理の流れ:
 * 1. 使用されているメタデータタイプのキーを収集
 * 2. メタデータタイプを取得または作成
 * 3. メタデータアイテムを作成するデータを収集
 * 4. 既存のメタデータを削除
 * 5. 新しいメタデータを作成
 *
 * @param segmentIds このページのセグメントIDのみを含むセット（他のページのセグメントは含まれない）
 * @param metadataDrafts 同期するメタデータドラフトの配列
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
		const existingTypes = await tx
			.selectFrom("segmentMetadataTypes")
			.select(["key", "id"])
			.where("key", "in", [...metadataTypeKeys])
			.execute();

		for (const mt of existingTypes) {
			metadataTypeMap.set(mt.key, mt.id);
		}

		// 存在しないメタデータタイプをバッチで自動作成
		const missingKeys = [...metadataTypeKeys].filter(
			(key) => !metadataTypeMap.has(key),
		);
		if (missingKeys.length > 0) {
			// 存在しないタイプをバッチで挿入（競合時は何もしない）
			await tx
				.insertInto("segmentMetadataTypes")
				.values(missingKeys.map((key) => ({ key, label: key })))
				.onConflict((oc) => oc.doNothing())
				.execute();

			// 挿入したタイプを再取得してマッピングに追加
			const createdTypes = await tx
				.selectFrom("segmentMetadataTypes")
				.select(["key", "id"])
				.where("key", "in", missingKeys)
				.execute();

			for (const created of createdTypes) {
				metadataTypeMap.set(created.key, created.id);
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

	// 既存のメタデータを削除
	// 注意: segmentIdsはこのページのセグメントIDのみを含むため、
	// 他のページのセグメントのメタデータは削除されない
	if (segmentIds.size > 0) {
		await tx
			.deleteFrom("segmentMetadata")
			.where("segmentId", "in", [...segmentIds])
			.execute();
	}

	// 新しいメタデータを作成
	if (metadataToCreate.length > 0) {
		await tx
			.insertInto("segmentMetadata")
			.values(metadataToCreate)
			.onConflict((oc) => oc.doNothing())
			.execute();
	}
}
