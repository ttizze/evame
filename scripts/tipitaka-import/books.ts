import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { BASE_DIR, BOOKS_JSON_PATH } from "./constants";
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

function ensureArray<T>(value: T[] | undefined | null): T[] {
	return Array.isArray(value) ? value : [];
}

let booksModulePromise: Promise<{
	getResolvedFileData: (fileName: string) => any;
}> | null = null;

async function loadBooksHelper() {
	if (!booksModulePromise) {
		booksModulePromise = (async () => {
			const scriptsDir = path.resolve("scripts");
			const entries = await fs.readdir(scriptsDir, { withFileTypes: true });
			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				if (!entry.name.startsWith("convert-romn-to-md")) continue;
				const candidateTs = path.join(scriptsDir, entry.name, "books.ts");
				const candidateJs = path.join(scriptsDir, entry.name, "books.js");
				const modulePath = (await fileExists(candidateTs))
					? candidateTs
					: (await fileExists(candidateJs))
						? candidateJs
						: null;
				if (!modulePath) continue;
				return import(pathToFileURL(modulePath).href) as Promise<{
					getResolvedFileData: (fileName: string) => any;
				}>;
			}
			throw new Error("convert-romn-to-md books module not found");
		})();
	}
	return booksModulePromise;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function deriveOrderHint(fileName: string): number {
	const base = fileName.replace(/\.md$/i, "");
	const match = base.match(/\d+/);
	if (!match) return Number.MAX_SAFE_INTEGER;
	return Number.parseInt(match[0], 10);
}

export async function readBooksJson(): Promise<{
	entries: ImportEntry[];
	indexMap: Map<number, ImportEntry>;
}> {
	const raw = await fs.readFile(BOOKS_JSON_PATH, "utf8");
	const payload = JSON.parse(raw) as BooksJsonPayload;
	const entries: ImportEntry[] = [];
	const indexMap = new Map<number, ImportEntry>();
	const booksModule = await loadBooksHelper();

	const orderedEntries = Object.entries(payload.data);

	orderedEntries.forEach(([fileKey, meta], idx) => {
		const mdFileName = `${path.basename(fileKey, path.extname(fileKey))}.md`;
		const filePath = path.join(BASE_DIR, ...meta.dirSegments, mdFileName);
		const resolved = booksModule.getResolvedFileData(fileKey);

		const primaryMula =
			meta.mulaFileName ??
			(meta.mulaFileNames.length > 0 ? meta.mulaFileNames[0]! : null);

		const entry: ImportEntry = {
			fileKey,
			mdFileName,
			filePath,
			level: meta.level,
			resolvedDirSegments: [...resolved.resolvedDirSegments],
			dirSegments: [...meta.dirSegments],
			orderHint: deriveOrderHint(mdFileName),
			mulaFileKey: primaryMula,
			atthakathaIndex:
				meta.level === "Tika" &&
				ensureArray(meta.atthakathaIndices)[0] !== undefined
					? ensureArray(meta.atthakathaIndices)[0]
					: undefined,
		};

		entries.push(entry);
		indexMap.set(idx, entry);
	});

	return { entries, indexMap };
}
