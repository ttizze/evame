/**
 * ページクエリ用の型定義（Prisma型への依存を削除）
 */

import type { PageStatus } from "@/drizzle/types";

/**
 * ページ検索条件
 * Prisma.PageWhereInputの代替型
 */
export type PageWhereInput = {
	status?: PageStatus;
	userId?: string;
	parentId?: number | null;
	id?: { in?: number[] };
	// 注: content.segments.some や tagPages.some などの複雑な条件は
	// 別途関数として実装する（例: searchPagesBySegmentText）
};

/**
 * ページソート条件
 * Prisma.PageOrderByWithRelationInputの代替型
 */
export type PageOrderByInput =
	| { createdAt: "asc" | "desc" }
	| { likePages: { _count: "asc" | "desc" } }
	| { order: "asc" | "desc" };
