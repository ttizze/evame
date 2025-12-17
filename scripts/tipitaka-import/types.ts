import type { Pages } from "@/db/types";

export interface TipitakaFileMeta {
	fileKey: string;
	primaryOrCommentary: string; // "Mula" | "Atthakatha" | "Tika" | "Other"
	dirSegments: string[];
	mulaFileKey: string | null;
}

export type PageWithContent = Pages;
