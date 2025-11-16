// import * as fs from "node:fs";
// import * as path from "node:path";
// import {
// 	extractTextContent,
// 	getChildElements,
// 	normalizeTagName,
// 	renderInlineChildren,
// 	renderInlineElementToString,
// } from "./tei";
// import type { Chapter } from "./types";

// // 目的: 章データを Markdown とディレクトリ構造へレンダリングする。
// // 処理: TEI ノードを Markdown 行に変換し、分類パスに沿ったフォルダへ書き出す。

// // 目的: `rend` 属性ごとに見出しレベルを定義する。
// // 処理: 章や節などの `rend` を Markdown のレベル数にマップする。
// const HEAD_LEVELS: Record<string, number> = {
// 	chapter: 2,
// 	book: 3,
// 	section: 4,
// 	subsection: 5,
// 	subsubsection: 6,
// };

// // 目的: 見出し扱いすべき段落 `rend` を Markdown レベルへ割り当てる。
// // 処理: `title` や `subhead` など段落レンダリングをレベル数へマッピングする。
// const PARAGRAPH_HEADING_LEVELS: Record<string, number> = {
// 	title: 2,
// 	chapter: 2,
// 	subhead: 3,
// 	subsubhead: 4,
// 	sub3head: 5,
// 	sub4head: 6,
// };

// // 目的: 詩句系 `rend` をコードブロックとして扱うか判定する。
// // 処理: ガーター系の `rend` 値を集合にして存在判定を高速化する。
// const GATHA_RENDS = new Set(["gatha1", "gatha2", "gatha3", "gathalast"]);

// // 目的: 見出し要素から Markdown の見出し行を生成する。
// // 処理: レベルを制限しつつ `renderInlineChildren` の結果にプレフィックスを付ける。
// function renderHeading(element: Element, level: number): string {
// 	const safeLevel = Math.min(Math.max(level, 1), 6);
// 	const content = renderInlineChildren(element).trim();
// 	const prefix = "#".repeat(safeLevel);
// 	return content ? `${prefix} ${content}` : prefix;
// }

// function collapseBlankLines(lines: string[]): string[] {
// 	const result: string[] = [];
// 	for (const line of lines) {
// 		const isBlank = line.trim().length === 0;
// 		if (isBlank) {
// 			if (
// 				result.length === 0 ||
// 				result[result.length - 1].trim().length === 0
// 			) {
// 				continue;
// 			}
// 			result.push("");
// 			continue;
// 		}
// 		result.push(line);
// 	}
// 	while (result.length > 0 && result[0].trim().length === 0) {
// 		result.shift();
// 	}
// 	while (result.length > 0 && result[result.length - 1].trim().length === 0) {
// 		result.pop();
// 	}
// 	return result;
// }

// // 目的: ブロック要素を Markdown 行配列へ変換する。
// // 処理: タグ名や `rend` を基にレンダリング分岐し、文字列配列を返す。
// function renderBlockElement(node: Element): string[] {
// 	const tag = normalizeTagName(node.tagName);
// 	const rend = (node.getAttribute("rend") ?? "").toLowerCase();

// 	switch (tag) {
// 		case "div":
// 			return getChildElements(node).flatMap((child) =>
// 				renderBlockElement(child),
// 			);
// 		case "head": {
// 			const level = HEAD_LEVELS[rend] ?? 3;
// 			return [renderHeading(node, level)];
// 		}
// 		case "p": {
// 			if (rend in PARAGRAPH_HEADING_LEVELS) {
// 				return [renderHeading(node, PARAGRAPH_HEADING_LEVELS[rend])];
// 			}
// 			if (rend && GATHA_RENDS.has(rend)) {
// 				const content = renderInlineChildren(node).trim();
// 				return [`\`\`\`\n${content}\n\`\`\``];
// 			}
// 			if (rend === "hangnum") {
// 				const number = (node.getAttribute("n") ?? "").trim();
// 				const marker = number.length > 0 ? `${number}.` : "1.";
// 				const rawText = extractTextContent(node).replace(/\s+/g, " ").trim();
// 				let content = rawText;
// 				if (number.length > 0 && content.startsWith(number)) {
// 					content = content.slice(number.length).trimStart();
// 					if (content.startsWith(".")) {
// 						content = content.slice(1).trimStart();
// 					}
// 				}
// 				return content.length > 0 ? [`${marker} ${content}`] : [marker];
// 			}
// 			const excludeAttrs = new Set(["n"]);
// 			if (rend === "bodytext" || rend === "centre" || rend === "unindented") {
// 				excludeAttrs.add("rend");
// 			}
// 			const attrs = attributesToString(node, excludeAttrs);
// 			const content = renderInlineChildren(node).trim();
// 			if (!attrs) {
// 				return [content];
// 			}
// 			return [`<p${attrs}>${content}</p>`];
// 		}
// 		case "note":
// 			return [renderInlineElementToString(node)];
// 		case "pb":
// 		case "lb":
// 		case "cb": {
// 			const emptyTag = normalizeTagName(node.tagName);
// 			const attrs = attributesToString(node);
// 			return [`<${emptyTag}${attrs} />`];
// 		}
// 		default:
// 			return [renderInlineElementToString(node)];
// 	}
// }

// // 目的: 書名や章題から安全なディレクトリ／ファイル名スラグを生成する。
// // 処理: 正規化でダイアクリティカルマークを削除し、英数字とハイフンに変換する。
// function slugify(input: string): string {
// 	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
// 	const ascii = normalized
// 		.toLowerCase()
// 		.replace(/[^a-z0-9]+/g, "-")
// 		.replace(/^-+|-+$/g, "");
// 	return ascii || "untitled";
// }

// // 目的: books.json の分類セグメントを出力ディレクトリ階層へ変換する。
// // 処理: 各セグメントをスラグ化し、重複を避けつつ書名スラグを末尾に付与する。
// function applyOrderPrefix(slug: string, order?: number): string {
// 	if (!slug.length || order === undefined || Number.isNaN(order)) {
// 		return slug;
// 	}
// 	const padded = order.toString().padStart(2, "0");
// 	return slug.startsWith(`${padded}-`) ? slug : `${padded}-${slug}`;
// }

// function parseLeadingOrder(dir: string): number | undefined {
// 	const m = dir.match(/^(\d{2,})-/);
// 	return m ? Number.parseInt(m[1], 10) : undefined;
// }

// export function resetChapterCounters(): void {
// 	// 章のディレクトリ名は章データの `order` に依存するため、特別なリセット処理は不要。
// }

// interface WriteChapterMarkdownOptions {
// 	reuseExistingChapterDir?: boolean;
// }

// // dirSegments を前提とするためフォールバックは提供しない。

// // 目的: 章の分類パスとタイトル情報から出力先ディレクトリを確定する。
// // 処理: 書名・章題をスラグ化し、連番付きフォルダを作成してパスを返す。
// function ensureChapterOutputDirectory(
// 	chapter: Chapter,
// 	outputDir: string,
// 	options: WriteChapterMarkdownOptions = {},
// ): string {
// 	const categoryDirs =
// 		Array.isArray(chapter.dirSegments) && chapter.dirSegments.length > 0
// 			? chapter.dirSegments
// 			: ["01-uncategorized"];

// 	// book スラグは dirSegments の末尾の序数を流用して付与する
// 	const bookSlugFromChapter = slugify(chapter.book);
// 	const titleForFolder = (chapter.baseTitle ?? chapter.title) || "";
// 	const trimmedTitle = titleForFolder.trim();
// 	const leadingNumberMatch = trimmedTitle.match(/^(\d+)(?:\)|\.|-|:)?\s*/);
// 	const inferredOrder = leadingNumberMatch
// 		? Number.parseInt(leadingNumberMatch[1] ?? "", 10)
// 		: NaN;
// 	const slugSource =
// 		leadingNumberMatch !== null
// 			? trimmedTitle.slice(leadingNumberMatch[0].length).trim() || trimmedTitle
// 			: trimmedTitle;
// 	const chapterSlug = slugify(slugSource || chapter.title);
// 	const sequence = Number.isFinite(inferredOrder)
// 		? inferredOrder
// 		: Math.max(chapter.order, 1);
// 	const folderName = `${sequence.toString().padStart(2, "0")}-${chapterSlug}`;
// 	const lastCategory = categoryDirs[categoryDirs.length - 1] ?? "01-";
// 	const bookOrder = parseLeadingOrder(lastCategory) ?? 1;

// 	// 注釈類（reuseExistingChapterDir=true）のときは、書名スラグを
// 	// XML 由来のものではなく、分類セグメント末尾（=ムーラ側の書名）から導出して
// 	// 同一の書籍フォルダ配下に共存させる。
// 	const bookSlugForFolder = options.reuseExistingChapterDir
// 		? lastCategory.replace(/^\d+-/, "") || bookSlugFromChapter
// 		: bookSlugFromChapter;

// 	const baseDir = path.join(
// 		outputDir,
// 		...categoryDirs,
// 		applyOrderPrefix(bookSlugForFolder, bookOrder),
// 	);

// 	fs.mkdirSync(baseDir, { recursive: true });

// 	if (options.reuseExistingChapterDir) {
// 		const prefix = `${sequence.toString().padStart(2, "0")}-`;
// 		try {
// 			const existing = fs
// 				.readdirSync(baseDir, { withFileTypes: true })
// 				.find((entry) => entry.isDirectory() && entry.name.startsWith(prefix));
// 			if (existing) {
// 				return path.join(baseDir, existing.name);
// 			}
// 		} catch {
// 			// ディレクトリ読み込みで問題があっても新規作成にフォールバックする。
// 		}
// 	}

// 	const chapterDir = path.join(baseDir, folderName);
// 	fs.mkdirSync(chapterDir, { recursive: true });
// 	return chapterDir;
// }

// // 入力: books.json 由来の分類セグメントや章タイトルなどを含む `Chapter` と、出力ルートディレクトリ。
// // 出力: `outputDir/<分類パス>/<書名スラグ>/<連番-章スラグ>/index.md` を生成し、章本文を Markdown として書き込む。
// // 処理: 章情報からディレクトリ／ファイル名を決め、前書き＋本文ノードをレンダリングして 1 つの Markdown にまとめる。
// export function writeChapterMarkdown(
// 	chapter: Chapter,
// 	outputDir: string,
// 	outputFileName: string = "index.md",
// 	options: WriteChapterMarkdownOptions = {},
// ): void {
// 	const chapterDir = ensureChapterOutputDirectory(chapter, outputDir, options);
// 	const preface = chapter.prefaceNodes.flatMap((node) =>
// 		renderBlockElement(node),
// 	);
// 	const content = chapter.contentNodes.flatMap((node) =>
// 		renderBlockElement(node),
// 	);
// 	const lines = collapseBlankLines([
// 		...preface,
// 		`## ${chapter.title}`,
// 		...content,
// 	]);

// 	const markdown = `${lines.join("\n\n").trim()}\n`;
// 	const outputPath = path.join(chapterDir, outputFileName);
// 	fs.writeFileSync(outputPath, markdown, "utf8");
// }
