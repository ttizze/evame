import type { Pagestatus } from "@/db/types";

export type PageWhereInput = {
	status?: Pagestatus;
	userId?: string;
	parentId?: number | null;
	id?: { in?: number[] };
	// 注: content.segments.some や tagPages.some などの複雑な条件は
	// 別途関数として実装する（例: searchPagesBySegmentText）
};

export type PageOrderByInput =
	| { createdAt: "asc" | "desc" }
	| { likePages: { _count: "asc" | "desc" } }
	| { order: "asc" | "desc" };
