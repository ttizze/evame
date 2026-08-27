import fs from "node:fs/promises";
import path from "node:path";

export interface TipitakaManifestInput {
	fileKey: string;
	level: string;
	dirSegments: string[];
	mulaFileName: string | null;
	mulaFileNames?: string[];
}

export interface TipitakaManifestEntry extends TipitakaManifestInput {
	kind: "PRIMARY" | "COMMENTARY";
	slug: string;
	title: string;
	parentSlug: string;
	position: number;
	mulaFileKey: string | null;
}

export interface TipitakaCategoryEntry {
	dirPath: string;
	slug: string;
	title: string;
	parentSlug: string;
	position: number;
}

interface BooksJsonPayload {
	generatedAt: string;
	count: number;
	data: Record<string, Omit<TipitakaManifestInput, "fileKey">>;
}

const DEFAULT_BOOKS_JSON_PATH = path.resolve(
	"scripts/tipitaka/data/books.json",
);

export function classifyTipitakaLevel(level: string): "PRIMARY" | "COMMENTARY" {
	switch (level.trim().toUpperCase()) {
		case "MULA":
		case "OTHER":
			return "PRIMARY";
		case "ATTHAKATHA":
		case "TIKA":
			return "COMMENTARY";
		default:
			throw new Error(`Unsupported Tipitaka level: ${level}`);
	}
}

function slugify(input: string): string {
	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	const ascii = normalized
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return ascii || "untitled";
}

function parseDirectorySegment(segment: string): {
	position: number;
	title: string;
} {
	const match = /^(\d+)-(.*)$/.exec(segment);
	if (!match?.[2]) {
		throw new Error(`Invalid Tipitaka directory segment: ${segment}`);
	}
	const position = Number.parseInt(match[1], 10);
	if (!Number.isSafeInteger(position)) {
		throw new Error(`Invalid Tipitaka directory order: ${segment}`);
	}
	const title = match[2]
		.replace(/-/g, " ")
		.replace(/\s+/g, " ")
		.replace(/\b\w/g, (character) => character.toUpperCase())
		.trim();
	if (!title) {
		throw new Error(`Invalid Tipitaka directory segment: ${segment}`);
	}
	return { position, title };
}

function deriveParentSlug(dirSegments: string[]): string {
	if (dirSegments.length <= 1) return "tipitaka";
	return slugify(`tipitaka-${dirSegments.slice(0, -1).join("-")}`);
}

function deriveEntry(
	fileKey: string,
	input: TipitakaManifestInput,
): TipitakaManifestEntry {
	if (!fileKey.trim()) throw new Error("Tipitaka file key must not be empty");
	if (input.dirSegments.length === 0) {
		throw new Error(`Tipitaka entry has no directory segments: ${fileKey}`);
	}
	const lastSegment = input.dirSegments[input.dirSegments.length - 1];
	if (!lastSegment) {
		throw new Error(
			`Tipitaka entry has an empty final directory segment: ${fileKey}`,
		);
	}
	const { position, title } = parseDirectorySegment(lastSegment);
	const mulaFileKey = input.mulaFileName ?? input.mulaFileNames?.[0] ?? null;

	return {
		fileKey,
		level: input.level,
		dirSegments: [...input.dirSegments],
		mulaFileName: input.mulaFileName,
		mulaFileNames: input.mulaFileNames ? [...input.mulaFileNames] : undefined,
		kind: classifyTipitakaLevel(input.level),
		slug: slugify(`tipitaka-${fileKey.replace(/\.[^.]+$/, "")}`),
		title,
		parentSlug: deriveParentSlug(input.dirSegments),
		position,
		mulaFileKey,
	};
}

/**
 * 既存books.jsonの階層情報を、新Turso seedで利用できる安定キーへ変換する。
 * 元ファイルは更新せず、入力配列も変更しない。
 */
export function buildTipitakaHierarchy(
	entries: TipitakaManifestInput[],
): TipitakaManifestEntry[] {
	const seenFileKeys = new Set<string>();
	return entries.map((entry) => {
		if (seenFileKeys.has(entry.fileKey)) {
			throw new Error(`Duplicate Tipitaka file key: ${entry.fileKey}`);
		}
		seenFileKeys.add(entry.fileKey);
		return deriveEntry(entry.fileKey, entry);
	});
}

/**
 * ファイルの親ディレクトリから、旧インポーターと同じカテゴリページ集合を作る。
 * 最終ディレクトリは書籍タイトルなのでカテゴリには含めない。
 */
export function buildTipitakaCategoryHierarchy(
	entries: TipitakaManifestEntry[],
): TipitakaCategoryEntry[] {
	const categories = new Map<string, TipitakaCategoryEntry>();
	for (const entry of entries) {
		for (let length = 1; length < entry.dirSegments.length; length += 1) {
			const segments = entry.dirSegments.slice(0, length);
			const dirPath = segments.join("/");
			if (categories.has(dirPath)) continue;
			const lastSegment = segments[segments.length - 1];
			if (!lastSegment) {
				throw new Error(`Tipitaka category has an empty segment: ${dirPath}`);
			}
			const { position, title } = parseDirectorySegment(lastSegment);
			const parentPath = segments.slice(0, -1).join("/");
			categories.set(dirPath, {
				dirPath,
				slug: slugify(`tipitaka-${dirPath}`),
				title,
				parentSlug: parentPath ? slugify(`tipitaka-${parentPath}`) : "tipitaka",
				position,
			});
		}
	}
	return [...categories.values()].sort(
		(a, b) =>
			a.dirPath.split("/").length - b.dirPath.split("/").length ||
			a.parentSlug.localeCompare(b.parentSlug) ||
			a.position - b.position ||
			a.dirPath.localeCompare(b.dirPath),
	);
}

/**
 * リポジトリ内のTipitaka manifestを読み込む。パスは既定値を持つが、
 * fixtureを渡せるようにして、実データへ接続しない単体テストを可能にする。
 */
export async function readTipitakaManifest(
	booksJsonPath: string = DEFAULT_BOOKS_JSON_PATH,
): Promise<TipitakaManifestEntry[]> {
	const raw = await fs.readFile(booksJsonPath, "utf8");
	let payload: BooksJsonPayload;
	try {
		payload = JSON.parse(raw) as BooksJsonPayload;
	} catch {
		throw new Error(
			`Invalid Tipitaka manifest JSON: ${path.basename(booksJsonPath)}`,
		);
	}
	if (
		!payload ||
		typeof payload !== "object" ||
		!payload.data ||
		typeof payload.data !== "object" ||
		Array.isArray(payload.data)
	) {
		throw new Error("Invalid Tipitaka manifest shape");
	}

	const entries = Object.entries(payload.data).map(([fileKey, input]) => ({
		fileKey,
		...input,
	}));
	return buildTipitakaHierarchy(entries);
}
