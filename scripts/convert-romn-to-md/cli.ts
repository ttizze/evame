import * as fs from "node:fs";
import * as path from "node:path";

import { DOMParser } from "@xmldom/xmldom";
import { getResolvedFileData } from "../convert-romn-to-md-nosplit/books";
import { extractBodyFrontMatter, extractChapters } from "./chapters";
import { resetChapterCounters, writeChapterMarkdown } from "./render";
import { extractTextByRend, getChildElements } from "./tei";
import type { Chapter } from "./types";

// 目的: CLI 全体を束ね、XML から Markdown への変換フローを提供する。
// 処理: 引数解析・XML 読み込み・章抽出・Markdown 出力をシーケンス化する。

const fsPromises = fs.promises;

// 目的: ムーラ各ファイルの「章番号→章タイトル」をキャッシュして、
// 注釈変換時に都度ムーラXMLを読み直さないようにする。
const mulaChapterTitleCache = new Map<string, Map<number, string>>();
// 章タイトルのスラグ -> 章番号 の逆引きキャッシュ
const mulaChapterSlugCache = new Map<string, Map<string, number>>();

function slugify(input: string): string {
	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	return (
		normalized
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "untitled"
	);
}

function hasLeadingNumber(text: string): boolean {
	return /^(\d+)(?:\)|\.|-|:)?\s*/.test(text.trim());
}

async function preloadMulaChapterTitles(
	inputDir: string,
	xmlFiles: string[],
): Promise<void> {
	const parser = new DOMParser({ errorHandler: () => undefined });
	for (const name of xmlFiles) {
		const lower = name.toLowerCase();
		const cls = getResolvedFileData(lower);
		if (cls.level !== "Mula") continue;
		const filePath = path.join(inputDir, name);
		const xml = await fsPromises.readFile(filePath, "utf16le");
		const doc = parser.parseFromString(xml, "application/xml");
		const body = doc.getElementsByTagName("body").item(0);
		if (!body) continue;
		const chapters = extractChapters(body, filePath);
		const byOrder = new Map<number, string>();
		const bySlug = new Map<string, number>();
		for (const ch of chapters) {
			byOrder.set(ch.order, ch.title);
			const slug = slugify(ch.title);
			if (slug.length > 0 && !bySlug.has(slug)) bySlug.set(slug, ch.order);
		}
		mulaChapterTitleCache.set(lower, byOrder);
		mulaChapterSlugCache.set(lower, bySlug);
	}
}

// 目的: 単一の XML ファイルを章ごとに Markdown へ変換する。
// 処理: XML をパースし、分類パスと前書きを取得して章レンダリングへ渡す。
export async function convertXmlFileToMarkdown(
	filePath: string,
	outputDir: string,
): Promise<void> {
	// 目的: UTF-16LE の XML ファイルを文字列として読み込む。
	// 処理: `fs.promises.readFile` でエンコーディング指定し内容を取得する。
	const xmlContent = await fsPromises.readFile(filePath, "utf16le");

	const parser = new DOMParser({ errorHandler: () => undefined });
	const document = parser.parseFromString(xmlContent, "application/xml");
	const bodies = document.getElementsByTagName("body");
	const body = bodies.item(0);
	if (!body) {
		throw new Error(`No <body> found in ${filePath}`);
	}
	if (bodies.length > 1) {
		throw new Error(`Multiple <body> found in ${filePath}`);
	}

	// 目的: books.json から分類セグメントを取得し出力ディレクトリ構成に反映する。
	// 処理: ファイル名をキーに `getFileData` を参照し、存在しなければエラーとする。
	const lower = path.basename(filePath).toLowerCase();
	const resolved = getResolvedFileData(lower);

	const shouldSplit =
		Array.isArray(resolved.chapterListTypes) &&
		resolved.chapterListTypes.length > 0;
	let chapters: Chapter[] = shouldSplit
		? extractChapters(body, filePath)
		: (() => {
				const fallbackBook = path.basename(filePath, path.extname(filePath));
				const title =
					extractTextByRend(body, "book", fallbackBook) ?? fallbackBook;
				const preface = extractBodyFrontMatter(body);
				return [
					{
						book: title,
						title,
						order: 1,
						prefaceNodes: preface,
						contentNodes: getChildElements(body),
						dirSegments: [...resolved.resolvedDirSegments],
					} as Chapter,
				];
			})();

	// 注釈の場合、対応ムーラの章タイトルでフォルダ名を固定する
	// ただし「順番」だけで機械的に合わせると序章等がずれるので、
	// 章題スラグ一致や見出し先頭の番号からムーラ章番号を推定して適用する。
	if (resolved.level !== "Mula" && resolved.mulaFileName) {
		const titleByOrder = mulaChapterTitleCache.get(resolved.mulaFileName);
		const orderBySlug = mulaChapterSlugCache.get(resolved.mulaFileName);
		if (titleByOrder && orderBySlug) {
			chapters = chapters.map<Chapter>((ch) => {
				// 1) 見出し先頭の番号があるならそれを優先
				let targetOrder: number | undefined;
				const m = ch.title.trim().match(/^(\d+)(?:\)|\.|-|:)?\s*/);
				if (m) {
					targetOrder = Number.parseInt(m[1] ?? "", 10);
				}
				// 2) 無ければ章題スラグで一致を探す
				if (!targetOrder || !Number.isFinite(targetOrder)) {
					const slug = slugify(ch.title);
					const ord = slug.length > 0 ? orderBySlug.get(slug) : undefined;
					if (ord && Number.isFinite(ord)) targetOrder = ord;
				}
				if (targetOrder && Number.isFinite(targetOrder)) {
					const mulaTitle = titleByOrder.get(targetOrder);
					if (mulaTitle) {
						const normalized = hasLeadingNumber(mulaTitle)
							? mulaTitle
							: `${targetOrder}. ${mulaTitle}`;
						return { ...ch, baseTitle: normalized } as Chapter;
					}
				}
				// 見つからなければそのまま
				return ch;
			});
		}
	}

	// dirSegments を章へ付与（分割・非分割どちらでも）
	if (
		Array.isArray(resolved.resolvedDirSegments) &&
		resolved.resolvedDirSegments.length > 0
	) {
		chapters = chapters.map((ch) => ({
			...ch,
			dirSegments: [...resolved.resolvedDirSegments],
		}));
	}

	// 目的: 元の XML ファイル名を基に出力 Markdown ファイル名を決定する。
	// 処理: 拡張子 `.xml` を `.md` に置き換え、本文と注釈を固有名で保存する。
	const outputFileName = `${path.basename(filePath, path.extname(filePath))}.md`;

	const reuseForCommentary =
		resolved.level !== "Mula" && !!resolved.mulaFileName;
	chapters.forEach((chapter) => {
		writeChapterMarkdown(chapter, outputDir, outputFileName, {
			// ムーラとの関連（books.json の紐付け）がある場合のみ、同一章フォルダを再利用
			reuseExistingChapterDir: reuseForCommentary,
		});
	});
}

// 目的: 入力ディレクトリ配下の XML を順に処理し Markdown へ変換する。
// 処理: 引数解析・パス解決・環境準備の後、XML を列挙して `convertXmlFileToMarkdown` に渡す。
export async function runConversionCli(): Promise<void> {
	// 目的: 固定の入出力パスを絶対パスに揃える。
	// 処理: `path.resolve` でカレントディレクトリ基準の絶対パスへ変換する。
	const inputDir = path.resolve(process.cwd(), "tipitaka-xml/romn");
	const outputDir = path.resolve(process.cwd(), "tipitaka-md");

	// 目的: 出力先ディレクトリが存在しない場合に作成しておく。
	// 処理: `fs.promises.mkdir` を再帰モードで呼び、ディレクトリを用意する。
	if (!fs.existsSync(outputDir)) {
		await fsPromises.mkdir(outputDir, { recursive: true });
	}

	// 目的: ファイル間で章番号の通しが干渉しないようカウンターを初期化する。
	// 処理: `resetChapterCounters` で内部カウンター Map をクリアする。
	resetChapterCounters();

	// 目的: 入力ディレクトリから変換対象の XML ファイルだけを抽出する。
	// 処理: `readdir` を Dirent 付きで列挙し、ファイルかつ拡張子が `.xml` のものだけを残す。
	const xmlFiles = (await fsPromises.readdir(inputDir, { withFileTypes: true }))
		.filter(
			(entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xml"),
		)
		.map((entry) => entry.name);

	// 目的: 事前にムーラの章タイトルをキャッシュして、注釈時の再読込を避ける。
	await preloadMulaChapterTitles(inputDir, xmlFiles);

	for (const name of xmlFiles) {
		const filePath = path.join(inputDir, name);
		await convertXmlFileToMarkdown(filePath, outputDir);
	}
}
