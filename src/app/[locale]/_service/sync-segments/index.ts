import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "./types";

// TransactionClient型を再エクスポート（他のサービスから使用されるため）
export type { TransactionClient } from "./types";

import {
	deleteStaleSegments,
	fetchExistingSegments,
	getSegmentTypeId,
	offsetSegmentNumbers,
	upsertSegmentBatch,
} from "./db/mutations.server";
import { separateDraftsByChangeStatus } from "./domain/separate-drafts";

/**
 * セグメントのupsert処理を実行する際のバッチサイズ
 */
const SEGMENT_UPSERT_CHUNK_SIZE = 200;

/**
 * セグメントをupsertで同期する（トランザクション内で呼ぶこと）
 *
 * 処理の流れ:
 * 1. 既存セグメントの番号を一時的にオフセットして重複を回避
 * 2. ドラフトをバッチでupsert（変更がないものはスキップ）
 * 3. ドラフトに含まれない既存セグメントを削除
 */
export async function syncSegments(
	tx: TransactionClient,
	contentId: number,
	drafts: SegmentDraft[],
	segmentTypeId: number | null,
): Promise<Map<string, number>> {
	// セグメントタイプIDを取得
	const resolvedSegmentTypeId = await getSegmentTypeId(tx, segmentTypeId);

	// 既存のセグメントを取得
	const existingSegments = await fetchExistingSegments(
		tx,
		contentId,
		resolvedSegmentTypeId,
	);

	const existingSegmentsByHash = new Map(
		existingSegments.map((segment) => [segment.textAndOccurrenceHash, segment]),
	);

	// 既存セグメントの番号を一時的にオフセットして重複を回避
	if (existingSegments.length > 0) {
		await offsetSegmentNumbers(tx, contentId, resolvedSegmentTypeId);
	}

	const syncedSegmentIdsByHash = new Map<string, number>();

	// ドラフトのハッシュ（string）をセットとして保持（削除対象の判定に使用）
	// Set<string>
	const draftHashes = new Set(
		drafts.map((draft) => draft.textAndOccurrenceHash),
	);

	// ドラフトをバッチサイズごとに分割してupsert処理を実行
	for (let i = 0; i < drafts.length; i += SEGMENT_UPSERT_CHUNK_SIZE) {
		const chunk = drafts.slice(i, i + SEGMENT_UPSERT_CHUNK_SIZE);

		// 変更が必要なドラフトと変更不要なドラフトを分離
		const { draftsNeedingUpsert, unchangedSegmentIdsByHash } =
			separateDraftsByChangeStatus(chunk, existingSegmentsByHash);

		// 変更不要で既存のまま残るセグメントのハッシュ（string）→ID（number）マッピングを追加
		for (const [hash, segmentId] of unchangedSegmentIdsByHash) {
			syncedSegmentIdsByHash.set(hash, segmentId);
		}

		// 新規作成または更新が必要なドラフトのみupsertを実行
		if (draftsNeedingUpsert.length > 0) {
			// upsertedSegmentIds: Map<string, number>（ハッシュ（string） → セグメントID（number））
			const upsertedSegmentIds = await upsertSegmentBatch(
				tx,
				contentId,
				resolvedSegmentTypeId,
				draftsNeedingUpsert,
			);

			// upsertしたセグメントのハッシュ（string）→ID（number）マッピングを追加（新規作成または更新された）
			for (const [hash, segmentId] of upsertedSegmentIds) {
				syncedSegmentIdsByHash.set(hash, segmentId);
			}
		}
	}

	// ドラフトに含まれない既存セグメントのハッシュ（string）を抽出して削除
	// string[]
	const hashesToDelete = existingSegments
		.map((segment) => segment.textAndOccurrenceHash)
		.filter((hash) => !draftHashes.has(hash));

	await deleteStaleSegments(
		tx,
		contentId,
		resolvedSegmentTypeId,
		new Set(hashesToDelete),
	);

	return syncedSegmentIdsByHash;
}
