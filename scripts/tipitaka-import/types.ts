import type { Prisma } from "@prisma/client";

export interface CategoryNode {
	dirSegment: string;
	title: string;
	order: number;
	children: Map<string, CategoryNode>;
	pageId?: number;
}

export interface TipitakaFileMeta {
	fileKey: string;
	primaryOrCommentary: string; // "Mula" | "Atthakatha" | "Tika" | "Other"
	dirSegments: string[];
	mulaFileKey: string | null;
}

export type PageWithContent = Prisma.PageGetPayload<{
	include: { content: true };
}>;
