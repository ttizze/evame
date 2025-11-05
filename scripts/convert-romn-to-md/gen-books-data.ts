import fs from "node:fs";
import path from "node:path";

type CommentaryLevel = "Mula" | "Atthakatha" | "Tika" | "Other";

interface BookRecord {
	index: number;
	fileName: string;
	longNavPath: string;
	navSegmentsDeva: string[];
	navSegmentsLatin: string[];
	level: CommentaryLevel;
	pitaka: string | null;
	mulaIndices: number[];
	atthakathaIndices: number[];
	tikaIndices: number[];
	chapterListTypes: string[];
	mulaFileName: string | null;
	mulaFileNames: string[];
	unlinked: boolean;
}

interface BookOutput {
	level: CommentaryLevel;
	dirSegments: string[];
	mulaFileName: string | null;
	mulaFileNames: string[];
	// From Books.cs links
	atthakathaIndices: number[];
	tikaIndices: number[];
	chapterListTypes: string[];
}

type BookMap = Map<string, BookRecord>;

const ROOT = process.cwd();
const BOOKS_SOURCE_PATH = path.resolve(
	ROOT,
	"scripts",
	"convert-romn-to-md",
	"data",
	"Books.cs",
);
const OUTPUT_JSON_PATH = path.resolve(
	ROOT,
	"scripts",
	"convert-romn-to-md",
	"data",
	"books.json",
);

const DEVA_TO_IPE: Record<string, string> = {
	"\u0902": "\u00C0",
	"\u00C1": "\u00C1",
	"\u0905": "\u00C1",
	"\u0906": "\u00C2",
	"\u0907": "\u00C3",
	"\u0908": "\u00C4",
	"\u0909": "\u00C5",
	"\u090A": "\u00C6",
	"\u090F": "\u00C7",
	"\u0913": "\u00C8",
	"\u0915": "\u00C9",
	"\u0916": "\u00CA",
	"\u0917": "\u00CB",
	"\u0918": "\u00CC",
	"\u0919": "\u00CD",
	"\u091A": "\u00CE",
	"\u091B": "\u00CF",
	"\u091C": "\u00D0",
	"\u091D": "\u00D1",
	"\u091E": "\u00D2",
	"\u091F": "\u00D3",
	"\u0920": "\u00D4",
	"\u0921": "\u00D5",
	"\u0922": "\u00D6",
	"\u0923": "\u00D8",
	"\u0924": "\u00D9",
	"\u0925": "\u00DA",
	"\u0926": "\u00DB",
	"\u0927": "\u00DC",
	"\u0928": "\u00DD",
	"\u092A": "\u00DE",
	"\u092B": "\u00DF",
	"\u092C": "\u00E0",
	"\u092D": "\u00E1",
	"\u092E": "\u00E2",
	"\u092F": "\u00E3",
	"\u0930": "\u00E4",
	"\u0932": "\u00E5",
	"\u0935": "\u00E6",
	"\u0938": "\u00E7",
	"\u0939": "\u00E8",
	"\u0933": "\u00E9",
	"\u093E": "\u00C2",
	"\u093F": "\u00C3",
	"\u0940": "\u00C4",
	"\u0941": "\u00C5",
	"\u0942": "\u00C6",
	"\u0947": "\u00C7",
	"\u094B": "\u00C8",
	"\u094D": "",
	"\u200C": "",
	"\u200D": "",
	"\u0966": "0",
	"\u0967": "1",
	"\u0968": "2",
	"\u0969": "3",
	"\u096A": "4",
	"\u096B": "5",
	"\u096C": "6",
	"\u096D": "7",
	"\u096E": "8",
	"\u096F": "9",
};

const IPE_TO_LATIN: Record<string, string> = {
	"\u00C0": "\u1E43",
	"\u00C1": "a",
	"\u00C2": "\u0101",
	"\u00C3": "i",
	"\u00C4": "\u012B",
	"\u00C5": "u",
	"\u00C6": "\u016B",
	"\u00C7": "e",
	"\u00C8": "o",
	"\u00C9": "k",
	"\u00CA": "kh",
	"\u00CB": "g",
	"\u00CC": "gh",
	"\u00CD": "\u1E45",
	"\u00CE": "c",
	"\u00CF": "ch",
	"\u00D0": "j",
	"\u00D1": "jh",
	"\u00D2": "\u00F1",
	"\u00D3": "\u1E6D",
	"\u00D4": "\u1E6Dh",
	"\u00D5": "\u1E0D",
	"\u00D6": "\u1E0Dh",
	"\u00D8": "\u1E47",
	"\u00D9": "t",
	"\u00DA": "th",
	"\u00DB": "d",
	"\u00DC": "dh",
	"\u00DD": "n",
	"\u00DE": "p",
	"\u00DF": "ph",
	"\u00E0": "b",
	"\u00E1": "bh",
	"\u00E2": "m",
	"\u00E3": "y",
	"\u00E4": "r",
	"\u00E5": "l",
	"\u00E6": "v",
	"\u00E7": "s",
	"\u00E8": "h",
	"\u00E9": "\u1E37",
};

const DEVANAGARI_DIGITS: Record<string, string> = {
	"०": "0",
	"१": "1",
	"२": "2",
	"३": "3",
	"४": "4",
	"५": "5",
	"६": "6",
	"७": "7",
	"८": "8",
	"९": "9",
};

function readBooksSource(): string {
	let content = fs.readFileSync(BOOKS_SOURCE_PATH, "utf16le");
	if (
		!content.includes("book = new Book();") &&
		content.includes("using System")
	) {
		content = fs.readFileSync(BOOKS_SOURCE_PATH, "utf8");
	}
	return content;
}

function parseBooks(): { byFile: BookMap; byIndex: Map<number, BookRecord> } {
	const raw = readBooksSource();
	const blocks = raw.split("book = new Book();");
	const byFile: BookMap = new Map();
	const byIndex = new Map<number, BookRecord>();
	const pendingAttha: Array<{ mula: BookRecord; indices: number[] }> = [];
	const pendingTika: Array<{ mula: BookRecord; indices: number[] }> = [];

	for (const block of blocks) {
		if (!block.includes("book.FileName")) continue;

		const index = extractNumber(block, "Index");
		if (index === null) continue;
		const fileName = extractString(block, "FileName").toLowerCase();
		const longNavPath = extractString(block, "LongNavPath");
		const matn = extractEnum(block, "Matn");
		const pitaka = extractEnum(block, "Pitaka");
		const mulaInfo = extractNumberList(block, "MulaIndex");
		const mulaIndices = mulaInfo.indices.filter((idx) => idx >= 0);
		const atthaInfo = extractNumberList(block, "AtthakathaIndex");
		const tikaInfo = extractNumberList(block, "TikaIndex");
		const chapterListTypesRaw = extractString(block, "ChapterListTypes");
		const chapterListTypes = chapterListTypesRaw
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		const unlinked = /\/\/\s*unlinked/.test(block);

		const navSegmentsDeva = longNavPath
			.split("/")
			.map((segment) => segment.trim());
		const navSegmentsLatin = navSegmentsDeva.map((segment) =>
			toTitleCase(convertDevaToLatin(segment).trim()),
		);

		const record: BookRecord = {
			index,
			fileName,
			longNavPath,
			navSegmentsDeva,
			navSegmentsLatin,
			level: mapLevel(matn),
			pitaka: pitaka ?? null,
			mulaIndices,
			atthakathaIndices: atthaInfo.indices,
			tikaIndices: tikaInfo.indices,
			chapterListTypes,
			mulaFileName: null,
			mulaFileNames: [],
			unlinked,
		};

		byFile.set(fileName, record);
		byIndex.set(index, record);

		if (record.level === "Mula") {
			if (atthaInfo.indices.length > 0) {
				pendingAttha.push({ mula: record, indices: atthaInfo.indices });
			}
			if (
				tikaInfo.indices.length > 0 &&
				!tikaInfo.indices.every((idx) => idx === 99999)
			) {
				pendingTika.push({ mula: record, indices: tikaInfo.indices });
			}
		}
	}

	const addMulaReference = (target: BookRecord, base?: BookRecord | null) => {
		if (!base) return;
		// Books.cs で明示的に unlinked とされたものは結び付けない
		if (target.unlinked) return;
		if (!target.mulaFileName) {
			target.mulaFileName = base.fileName;
		}
		if (!target.mulaFileNames.includes(base.fileName)) {
			target.mulaFileNames.push(base.fileName);
		}
	};

	for (const link of pendingAttha) {
		for (const idx of link.indices) {
			if (idx === 99999) continue;
			const commentary = byIndex.get(idx);
			if (commentary) {
				addMulaReference(commentary, link.mula);
			}
		}
	}
	for (const link of pendingTika) {
		for (const idx of link.indices) {
			if (idx === 99999) continue;
			const commentary = byIndex.get(idx);
			if (commentary) {
				addMulaReference(commentary, link.mula);
			}
		}
	}

	for (const record of byFile.values()) {
		if (record.unlinked) continue;
		for (const idx of record.mulaIndices) {
			const base = byIndex.get(idx);
			if (base) addMulaReference(record, base);
		}
	}

	// 推測によるムーラ紐付けは行わない（Books.cs の明示リンクのみを尊重）

	return { byFile, byIndex };
}

function extractNumber(block: string, property: string): number | null {
	const regex = new RegExp(`book\\.${property}\\s*=\\s*(-?\\d+);`);
	const match = block.match(regex);
	return match ? Number.parseInt(match[1], 10) : null;
}

function extractNumberList(
	block: string,
	property: string,
): { indices: number[]; comment: string | null } {
	const regex = new RegExp(
		`book\\.${property}\\s*=\\s*(-?\\d+);(?:\\s*//\\s*([^\\n]+))?`,
	);
	const match = block.match(regex);
	if (!match) {
		return { indices: [], comment: null };
	}
	const base = Number.parseInt(match[1], 10);
	const indices = new Set<number>([base]);
	const comment = match[2] ?? null;
	if (comment) {
		for (const num of comment.match(/\d+/g) ?? []) {
			indices.add(Number.parseInt(num, 10));
		}
	}
	return { indices: [...indices], comment };
}

function extractString(block: string, property: string): string {
	const regex = new RegExp(`book\\.${property}\\s*=\\s*"([^"]*)";`);
	const match = block.match(regex);
	return match ? match[1] : "";
}

function extractEnum(block: string, property: string): string | null {
	const regex = new RegExp(
		`book\\.${property}\\s*=\\s*([A-Za-z]+)\\.([A-Za-z]+);`,
	);
	const match = block.match(regex);
	return match ? match[2] : null;
}

function mapLevel(value: string | null): CommentaryLevel {
	if (value === "Mula") return "Mula";
	if (value === "Atthakatha") return "Atthakatha";
	if (value === "Tika") return "Tika";
	return "Other";
}

function convertDevaToLatin(input: string): string {
	const ipe = convertDevaToIpe(input);
	const latin = convertIpeToLatin(ipe);
	return latin.replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] ?? digit);
}

function convertDevaToIpe(devStr: string): string {
	const consonantInsert = /([\u0915-\u0939])([^\u093E-\u094D\u00C1])/g;
	devStr = devStr.replace(consonantInsert, "$1\u00C1$2");
	devStr = devStr.replace(consonantInsert, "$1\u00C1$2");
	devStr = devStr.replace(/([\u0915-\u0939])$/g, "$1\u00C1");

	let result = "";
	for (const ch of devStr) {
		const mapped = DEVA_TO_IPE[ch];
		result += mapped ?? ch;
	}
	return result;
}

function convertIpeToLatin(ipe: string): string {
	let result = "";
	for (const ch of ipe) {
		const mapped = IPE_TO_LATIN[ch];
		result += mapped ?? ch;
	}
	return result;
}

function toTitleCase(value: string): string {
	return value.replace(/\p{Letter}[\p{Letter}\p{Mark}'’-]*/gu, (word) => {
		const [head, ...rest] = [...word];
		return [head.toUpperCase(), ...rest].join("");
	});
}
interface OrderNode {
	nextOrder: number;
	children: Map<string, OrderNode>;
	assignments: Map<string, number>;
}

function createOrderNode(): OrderNode {
	return {
		nextOrder: 1,
		children: new Map(),
		assignments: new Map(),
	};
}

function assignOrders(root: OrderNode, segments: string[]): number[] {
	const orders: number[] = [];
	let node = root;
	for (const segment of segments) {
		let order = node.assignments.get(segment);
		if (order === undefined) {
			order = node.nextOrder++;
			node.assignments.set(segment, order);
		}
		let child = node.children.get(segment);
		if (!child) {
			child = createOrderNode();
			node.children.set(segment, child);
		}
		orders.push(order);
		node = child;
	}
	return orders;
}

function buildOutputData(byFile: BookMap): Record<string, BookOutput> {
	const output: Record<string, BookOutput> = {};
	const navRoot = createOrderNode();
	const records = [...byFile.values()].sort((a, b) => a.index - b.index);

	for (const record of records) {
		const navSegments = [...record.navSegmentsLatin];
		const navSegmentOrders = assignOrders(navRoot, navSegments);
		const dirSegments = navSegments.map((seg, i) => {
			const order = navSegmentOrders[i] ?? i + 1;
			return `${String(order).padStart(2, "0")}-${slugify(seg)}`;
		});

		// Filter out invalid/sentinel indices
		const atthakathaIndices = record.atthakathaIndices.filter(
			(n) => Number.isFinite(n) && n >= 0 && n !== 99999,
		);
		const tikaIndices = record.tikaIndices.filter(
			(n) => Number.isFinite(n) && n >= 0 && n !== 99999,
		);

		output[record.fileName] = {
			level: record.level,
			dirSegments,
			mulaFileName: record.mulaFileName,
			mulaFileNames: [...record.mulaFileNames],
			atthakathaIndices,
			tikaIndices,
			chapterListTypes: [...record.chapterListTypes],
		};
	}
	return output;
}

function slugify(input: string): string {
	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	const ascii = normalized
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return ascii || "untitled";
}

function main(): void {
	const { byFile } = parseBooks();
	const data = buildOutputData(byFile);
	const payload = {
		generatedAt: new Date().toISOString(),
		count: Object.keys(data).length,
		data,
	};
	fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(payload, null, 2), "utf8");
	console.log(`Generated books.json with ${payload.count} entries.`);
}

main();
