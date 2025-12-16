import type { Page } from "@/drizzle/types";

export interface TipitakaFileMeta {
	fileKey: string;
	primaryOrCommentary: string; // "Mula" | "Atthakatha" | "Tika" | "Other"
	dirSegments: string[];
	mulaFileKey: string | null;
}

export type PageWithContent = Page;
