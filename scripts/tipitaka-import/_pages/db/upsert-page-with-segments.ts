import type { PrismaClient } from "@prisma/client";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { syncSegmentsWithFallback } from "./sync-segments-with-fallback";
import { type UpsertPageParams, upsertPage } from "./upsert-page";

type TransactionClient = Parameters<
	Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * ページを upsert し、セグメントを同期する共通処理
 */
export async function upsertPageWithSegments(
	tx: TransactionClient,
	params: Omit<UpsertPageParams, "tx"> & {
		segments: SegmentDraft[];
		fallbackTitle: string;
		segmentTypeId: number;
	},
): Promise<number> {
	const page = await upsertPage({ ...params, tx });
	await syncSegmentsWithFallback(
		tx,
		page.id,
		params.segments,
		params.fallbackTitle,
		params.segmentTypeId,
	);
	return page.id;
}

export type { UpsertPageParams };
