import fs from "node:fs/promises";

import { BOOKS_JSON_PATH } from "./constants";
import type { TipitakaFileMeta } from "./types";

interface BooksJsonPayload {
	generatedAt: string;
	count: number;
	data: Record<string, BookMeta>;
}

interface BookMeta {
	level: string;
	dirSegments: string[];
	mulaFileName: string | null;
	mulaFileNames: string[];
	atthakathaIndices: number[];
	tikaIndices: number[];
	chapterListTypes?: string[];
}

export async function readBooksJson(): Promise<{
	tipitakaFileMetas: TipitakaFileMeta[];
	indexMap: Map<number, TipitakaFileMeta>;
}> {
	const raw = await fs.readFile(BOOKS_JSON_PATH, "utf8");
	const payload = JSON.parse(raw) as BooksJsonPayload;
	const tipitakaFileMetas: TipitakaFileMeta[] = [];
	const indexMap = new Map<number, TipitakaFileMeta>();

	const orderedEntries = Object.entries(payload.data);

	orderedEntries.forEach(([fileKey, meta], idx) => {
		const primaryMula =
			meta.mulaFileName ??
			(meta.mulaFileNames.length > 0 ? (meta.mulaFileNames[0] ?? null) : null);

		const tipitakaFileMeta: TipitakaFileMeta = {
			fileKey,
			primaryOrCommentary: meta.level,
			dirSegments: [...meta.dirSegments],
			mulaFileKey: primaryMula,
		};

		tipitakaFileMetas.push(tipitakaFileMeta);
		indexMap.set(idx, tipitakaFileMeta);
	});

	return { tipitakaFileMetas, indexMap };
}
