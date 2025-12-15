export type { TransactionClient } from "@/drizzle/types";

/**
 * 既存セグメントの情報（変更検出に使用）
 */
export type ExistingSegment = {
	id: number;
	text: string;
	number: number;
	textAndOccurrenceHash: string;
};
