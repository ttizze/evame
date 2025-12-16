import type { Transaction } from "kysely";
import type { DB } from "@/db/types";

export type TransactionClient = Transaction<DB>;

/**
 * 既存セグメントの情報（変更検出に使用）
 */
export type ExistingSegment = {
	id: number;
	text: string;
	number: number;
	textAndOccurrenceHash: string;
};
