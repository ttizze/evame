import { sql } from "kysely";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { ExistingSegment, TransactionClient } from "../types";

/**
 * セグメントタイプIDを取得する（指定されていない場合はPRIMARYをデフォルトとして使用）
 */
export async function getSegmentTypeId(
	tx: TransactionClient,
	segmentTypeId: number | null,
): Promise<number> {
	if (segmentTypeId) {
		return segmentTypeId;
	}

	const segmentType = await tx
		.selectFrom("segmentTypes")
		.select("id")
		.where("key", "=", "PRIMARY")
		.executeTakeFirst();

	if (!segmentType) {
		throw new Error("Primary segment type not found");
	}

	return segmentType.id;
}

/**
 * 既存のセグメントを取得する（ID、text、number、ハッシュを取得して変更検出に使用）
 */
export async function fetchExistingSegments(
	tx: TransactionClient,
	contentId: number,
	segmentTypeId: number,
): Promise<ExistingSegment[]> {
	return await tx
		.selectFrom("segments")
		.select(["id", "text", "number", "textAndOccurrenceHash"])
		.where("contentId", "=", contentId)
		.where("segmentTypeId", "=", segmentTypeId)
		.execute();
}

/**
 * 既存セグメントの番号を一時的にオフセットして重複を回避する
 */
export async function offsetSegmentNumbers(
	tx: TransactionClient,
	contentId: number,
	segmentTypeId: number,
): Promise<void> {
	await tx
		.updateTable("segments")
		.set({
			number: sql`number + 1000000`,
		})
		.where("contentId", "=", contentId)
		.where("segmentTypeId", "=", segmentTypeId)
		.execute();
}

/**
 * セグメントを1つupsertする（存在すれば更新、存在しなければ作成）
 */
async function upsertSingleSegment(
	tx: TransactionClient,
	contentId: number,
	segmentTypeId: number,
	draft: SegmentDraft,
): Promise<{ hash: string; segmentId: number }> {
	const segment = await tx
		.insertInto("segments")
		.values({
			contentId,
			text: draft.text,
			number: draft.number,
			textAndOccurrenceHash: draft.textAndOccurrenceHash,
			segmentTypeId,
		})
		.onConflict((oc) =>
			oc.columns(["contentId", "textAndOccurrenceHash"]).doUpdateSet({
				number: draft.number,
			}),
		)
		.returning(["id"])
		.executeTakeFirstOrThrow();

	return {
		hash: draft.textAndOccurrenceHash,
		segmentId: segment.id,
	};
}

/**
 * バッチでセグメントをupsertする
 */
export async function upsertSegmentBatch(
	tx: TransactionClient,
	contentId: number,
	segmentTypeId: number,
	draftsNeedingUpsert: SegmentDraft[],
): Promise<Map<string, number>> {
	// segmentIdsByHash: Map<string, number>（ハッシュ（string） → セグメントID（number））
	const segmentIdsByHash = new Map<string, number>();

	const results = await Promise.all(
		draftsNeedingUpsert.map((draft) =>
			upsertSingleSegment(tx, contentId, segmentTypeId, draft),
		),
	);

	for (const { hash, segmentId } of results) {
		segmentIdsByHash.set(hash, segmentId);
	}

	return segmentIdsByHash;
}

/**
 * ドラフトに含まれない既存セグメントを削除する
 */
export async function deleteStaleSegments(
	tx: TransactionClient,
	contentId: number,
	segmentTypeId: number,
	hashesToDelete: Set<string>,
): Promise<void> {
	if (hashesToDelete.size === 0) {
		return;
	}

	await tx
		.deleteFrom("segments")
		.where("contentId", "=", contentId)
		.where("segmentTypeId", "=", segmentTypeId)
		.where("textAndOccurrenceHash", "in", [...hashesToDelete])
		.execute();
}
