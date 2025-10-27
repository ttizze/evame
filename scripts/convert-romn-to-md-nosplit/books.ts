import * as fs from "node:fs";
import * as path from "node:path";

interface BookData {
	level: "Mula" | "Atthakatha" | "Tika" | "Other";
	dirSegments: string[];
	mulaFileName: string | null;
	mulaFileNames: string[];
	chapterListTypes?: string[];
}

interface BooksJsonPayload {
	generatedAt: string;
	count: number;
	data: Record<string, BookData>;
}

const BOOKS_JSON_PATH = path.resolve(
	process.cwd(),
	"scripts",
	"convert-romn-to-md-nosplit",
	"data",
	"books.json",
);

const booksData = loadBooksJson();

function loadBooksJson(): Record<string, BookData> {
	if (!fs.existsSync(BOOKS_JSON_PATH)) {
		throw new Error(
			`books.json が存在しません。gen-books-data.mjs を実行してから再度お試しください: ${BOOKS_JSON_PATH}`,
		);
	}
	const raw = fs.readFileSync(BOOKS_JSON_PATH, "utf8");
	const payload = JSON.parse(raw) as BooksJsonPayload;
	if (!payload || !payload.data) {
		throw new Error("books.json の形式が不正です。");
	}
	return payload.data;
}

export function getFileData(fileName: string): {
	level: BookData["level"];
	dirSegments: string[];
	chapterListTypes?: string[];
} {
	const book = booksData[fileName.toLowerCase()];
	if (!book) {
		throw new Error(
			`books.json に分類情報がありません: ${fileName.toLowerCase()}`,
		);
	}
	return {
		level: book.level,
		dirSegments: Array.isArray(book.dirSegments) ? [...book.dirSegments] : [],
		chapterListTypes: book.chapterListTypes,
	};
}

// Backward-compatible alias (deprecated): use getFileData instead
export const getClassificationForFile = getFileData;

// 目的: 変換時に使用する「解決済み」メタ情報を一度に取得する。
// 処理: 注釈系はムーラに紐付いていればムーラの dirSegments を採用し、
//       それ以外は自身の dirSegments を返す。あわせて mulaFileName も返す。
export function getResolvedFileData(fileName: string): {
	level: BookData["level"];
	// 自身の chapterListTypes をそのまま返す
	chapterListTypes?: string[];
	// books.json に記載の（または最初の）ムーラファイル名
	mulaFileName: string | null;
	// 実際に出力先の分類として使う dirSegments（ムーラに解決済み）
	resolvedDirSegments: string[];
} {
	const lower = fileName.toLowerCase();
	const current = getFileData(lower);
	const raw = booksData[lower];
	const mula = (() => {
		if (!raw) return null;
		if (raw.level === "Mula") return lower;
		if (Array.isArray(raw.mulaFileNames) && raw.mulaFileNames.length > 0) {
			return raw.mulaFileNames[0] ?? raw.mulaFileName ?? null;
		}
		return raw.mulaFileName ?? null;
	})();

	const target = current.level === "Mula" ? lower : (mula ?? lower);
	const base = getFileData(target);

	return {
		level: current.level,
		chapterListTypes: current.chapterListTypes,
		mulaFileName: mula,
		resolvedDirSegments: Array.isArray(base.dirSegments)
			? [...base.dirSegments]
			: [],
	};
}

export function getMulaFileForCommentary(fileName: string): string | null {
	const book = booksData[fileName.toLowerCase()];
	if (!book) return null;
	if (book.level === "Mula") {
		return fileName.toLowerCase();
	}
	if (Array.isArray(book.mulaFileNames) && book.mulaFileNames.length > 0) {
		return book.mulaFileNames[0] ?? null;
	}
	return book.mulaFileName ?? null;
}
