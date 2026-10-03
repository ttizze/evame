import { sql } from "kysely";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "../types";

/**
 * 既存のセグメントを取得する（ID、text、number、ハッシュを取得して変更検出に使用）
 */
export async function fetchExistingSegments(
	tx: TransactionClient,
	contentId: number,
) {
	return await tx
		.selectFrom("segments")
		.select(["textAndOccurrenceHash"])
		.where("contentId", "=", contentId)
		.execute();
}

/**
 * 既存セグメントの番号を一時的にオフセットして重複を回避する
 */
export async function offsetSegmentNumbers(
	tx: TransactionClient,
	contentId: number,
): Promise<void> {
	await tx
		.updateTable("segments")
		.set({
			number: sql`number + 1000000`,
		})
		.where("contentId", "=", contentId)
		.execute();
}

/** ドラフトをバッチで同期し、本文のハッシュが同じセグメントのIDは維持する。 */
export async function upsertSegmentBatch(
	tx: TransactionClient,
	contentId: number,
	drafts: SegmentDraft[],
): Promise<void> {
	await Promise.all(
		drafts.map((draft) =>
			tx
				.insertInto("segments")
				.values({
					contentId,
					text: draft.text,
					number: draft.number,
					textAndOccurrenceHash: draft.textAndOccurrenceHash,
				})
				.onConflict((oc) =>
					oc
						.columns(["contentId", "textAndOccurrenceHash"])
						.doUpdateSet({ number: draft.number }),
				)
				.execute(),
		),
	);
}

/**
 * ドラフトに含まれない既存セグメントを削除する
 */
export async function deleteStaleSegments(
	tx: TransactionClient,
	contentId: number,
	hashesToDelete: Set<string>,
): Promise<void> {
	if (hashesToDelete.size === 0) {
		return;
	}

	await tx
		.deleteFrom("segments")
		.where("contentId", "=", contentId)
		.where("textAndOccurrenceHash", "in", [...hashesToDelete])
		.execute();
}
