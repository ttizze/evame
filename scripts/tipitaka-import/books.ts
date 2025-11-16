import fs from "node:fs/promises";

import { BOOKS_JSON_PATH } from "./constants";
import type { ImportEntry } from "./types";

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
	entries: ImportEntry[];
	indexMap: Map<number, ImportEntry>;
}> {
	const raw = await fs.readFile(BOOKS_JSON_PATH, "utf8");
	const payload = JSON.parse(raw) as BooksJsonPayload;
	const entries: ImportEntry[] = [];
	const indexMap = new Map<number, ImportEntry>();

	const orderedEntries = Object.entries(payload.data);

	orderedEntries.forEach(([fileKey, meta], idx) => {
		const primaryMula =
			meta.mulaFileName ??
			(meta.mulaFileNames.length > 0 ? (meta.mulaFileNames[0] ?? null) : null);

		const entry: ImportEntry = {
			fileKey,
			level: meta.level,
			dirSegments: [...meta.dirSegments],
			mulaFileKey: primaryMula,
		};

		entries.push(entry);
		indexMap.set(idx, entry);
	});

	return { entries, indexMap };
}
