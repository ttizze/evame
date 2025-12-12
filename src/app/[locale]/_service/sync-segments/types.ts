import type { db } from "@/drizzle";

/**
 * Drizzleのトランザクションクライアントの型
 */
export type TransactionClient = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

/**
 * 既存セグメントの情報（変更検出に使用）
 */
export type ExistingSegment = {
	id: number;
	text: string;
	number: number;
	textAndOccurrenceHash: string;
};
