import { and, eq, inArray, sql } from "drizzle-orm";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { segments, segmentTypes } from "@/drizzle/schema";
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

	const [segmentType] = await tx
		.select({ id: segmentTypes.id })
		.from(segmentTypes)
		.where(eq(segmentTypes.key, "PRIMARY"))
		.limit(1);

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
		.select({
			id: segments.id,
			text: segments.text,
			number: segments.number,
			textAndOccurrenceHash: segments.textAndOccurrenceHash,
		})
		.from(segments)
		.where(
			and(
				eq(segments.contentId, contentId),
				eq(segments.segmentTypeId, segmentTypeId),
			),
		);
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
		.update(segments)
		.set({
			number: sql`${segments.number} + ${1_000_000}`,
		})
		.where(
			and(
				eq(segments.contentId, contentId),
				eq(segments.segmentTypeId, segmentTypeId),
			),
		);
}

/**
 * セグメントを1つupsertする（存在すれば更新、存在しなければ作成）
 */
export async function upsertSingleSegment(
	tx: TransactionClient,
	contentId: number,
	segmentTypeId: number,
	draft: SegmentDraft,
): Promise<{ hash: string; segmentId: number }> {
	const [segment] = await tx
		.insert(segments)
		.values({
			contentId,
			text: draft.text,
			number: draft.number,
			textAndOccurrenceHash: draft.textAndOccurrenceHash,
			segmentTypeId,
		})
		.onConflictDoUpdate({
			target: [segments.contentId, segments.textAndOccurrenceHash],
			set: {
				number: draft.number,
			},
		})
		.returning({ id: segments.id });

	if (!segment) {
		throw new Error(
			`Failed to upsert segment with hash ${draft.textAndOccurrenceHash}`,
		);
	}

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
		.delete(segments)
		.where(
			and(
				eq(segments.contentId, contentId),
				eq(segments.segmentTypeId, segmentTypeId),
				inArray(segments.textAndOccurrenceHash, [...hashesToDelete]),
			),
		);
}
