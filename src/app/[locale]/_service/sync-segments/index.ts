import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "./types";

// TransactionClient型を再エクスポート（他のサービスから使用されるため）
export type { TransactionClient } from "./types";

import {
	deleteStaleSegments,
	fetchExistingSegments,
	offsetSegmentNumbers,
	upsertSegmentBatch,
} from "./db/mutations.server";

/**
 * セグメントのupsert処理を実行する際のバッチサイズ
 */
const SEGMENT_UPSERT_CHUNK_SIZE = 200;

/**
 * セグメントをupsertで同期する（トランザクション内で呼ぶこと）
 *
 * 処理の流れ:
 * 1. 既存セグメントの番号を一時的にオフセットして重複を回避
 * 2. すべてのドラフトをバッチでupsert
 * 3. ドラフトに含まれない既存セグメントを削除
 */
export async function syncSegments(
	tx: TransactionClient,
	contentId: number,
	drafts: SegmentDraft[],
): Promise<void> {
	// 既存のセグメントを取得
	const existingSegments = await fetchExistingSegments(tx, contentId);

	// 既存セグメントのハッシュをセットとして保持（削除対象として開始）
	const staleHashes = new Set(
		existingSegments.map((s) => s.textAndOccurrenceHash),
	);

	// 既存セグメントの番号を一時的にオフセットして重複を回避
	if (existingSegments.length > 0) {
		await offsetSegmentNumbers(tx, contentId);
	}

	// すべてのドラフトをバッチサイズごとに分割してupsert処理を実行
	for (let i = 0; i < drafts.length; i += SEGMENT_UPSERT_CHUNK_SIZE) {
		const chunk = drafts.slice(i, i + SEGMENT_UPSERT_CHUNK_SIZE);

		await upsertSegmentBatch(tx, contentId, chunk);

		for (const draft of chunk) staleHashes.delete(draft.textAndOccurrenceHash);
	}

	// ドラフトに含まれない既存セグメントを削除
	await deleteStaleSegments(tx, contentId, staleHashes);
}
