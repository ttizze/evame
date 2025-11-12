import * as fs from "node:fs";
import * as path from "node:path";
import {
	BLOCK_TYPES,
	GATHA_BLOCK_TYPES,
} from "../../src/app/[locale]/_lib/custom-block-types";
import {
	getChildElements,
	normalizeTagName,
	renderInlineChildren,
	renderInlineElementToString,
} from "./tei";
import type { BookDoc } from "./types";

// 目的: チャプター分割せず、書籍単位で Markdown を 1 ファイル出力する。

const REND_HEADING_LEVELS: Record<string, number> = {
	nikaya: 1,
	book: 2,
	chapter: 3,
	title: 4,
	subhead: 4,
	subsubhead: 4,
};

const GATHA_RENDS = new Set<string>(GATHA_BLOCK_TYPES);
const BLOCK_RENDS = new Set<string>(BLOCK_TYPES);

function renderHeading(element: Element, level: number): string {
	const safeLevel = Math.min(Math.max(level, 1), 6);
	const content = renderInlineChildren(element).trim();
	const prefix = "#".repeat(safeLevel);
	return content ? `${prefix} ${content}` : prefix;
}

function collapseBlankLines(lines: string[]): string[] {
	const result: string[] = [];
	for (const line of lines) {
		const isBlank = line.trim().length === 0;
		if (isBlank) {
			if (
				result.length === 0 ||
				result[result.length - 1].trim().length === 0
			) {
				continue;
			}
			result.push("");
			continue;
		}
		result.push(line);
	}
	while (result.length > 0 && result[0].trim().length === 0) result.shift();
	while (result.length > 0 && result[result.length - 1].trim().length === 0)
		result.pop();
	return result;
}

function renderParagraph(node: Element): string[] {
	const rend = (node.getAttribute("rend") ?? "").toLowerCase();

	// 見出しとして扱うrend属性の場合
	if (rend in REND_HEADING_LEVELS) {
		return [renderHeading(node, REND_HEADING_LEVELS[rend])];
	}

	// 偈（詩）として扱うrend属性の場合
	if (rend && GATHA_RENDS.has(rend)) {
		const content = renderInlineChildren(node).trim();
		// ガーターは特殊記法で出力（::gatha1\n...\n::）
		if (!content) return [""];
		return [`::${rend}\n${content}\n::`];
	}

	// ブロック形式のrend属性（indent, unindented, centre）
	if (rend && BLOCK_RENDS.has(rend)) {
		const content = renderInlineChildren(node).trim();
		if (!content) return [""];
		return [`::${rend}\n${content}\n::`];
	}

	// hangnum: ハンギング番号（番号だけの独立した段落）
	if (rend === "hangnum") {
		let content = renderInlineChildren(node).trim();
		// paranumの処理で追加されたエスケープ記号を削除
		content = content.replace(/\\$/, "");
		return content ? [`::hangnum\n${content}\n::`] : [""];
	}

	// 通常の段落として処理（rend属性がない場合、またはbodytextの場合）
	// すべてのrend属性は上記で処理済みなので、ここに到達するのはrend属性がない場合のみ
	const content = renderInlineChildren(node).trim();
	return [content];
}

function renderDiv(node: Element): string[] {
	const children = getChildElements(node);
	const results: string[] = [];

	for (const child of children) {
		results.push(...renderBlockElement(child));
	}

	return results;
}

function renderBlockElement(node: Element): string[] {
	const tag = normalizeTagName(node.tagName);
	const rend = (node.getAttribute("rend") ?? "").toLowerCase();

	switch (tag) {
		case "div":
			return renderDiv(node);
		case "head": {
			const level = REND_HEADING_LEVELS[rend] ?? 3;
			return [renderHeading(node, level)];
		}
		case "p":
			return renderParagraph(node);
		case "trailer": {
			// trailerは通常centre（中央揃え）で表示
			const content = renderInlineChildren(node).trim();
			return content ? [`::centre\n${content}\n::`] : [""];
		}
		default:
			return [renderInlineElementToString(node)];
	}
}

function ensureBookOutputDirectory(doc: BookDoc, outputDir: string): string {
	const baseDir = path.join(outputDir, ...doc.dirSegments);
	fs.mkdirSync(baseDir, { recursive: true });
	return baseDir;
}

export function writeBookMarkdown(
	doc: BookDoc,
	outputDir: string,
	outputFileName: string = "index.md",
): void {
	const bookDir = ensureBookOutputDirectory(doc, outputDir);

	const content = doc.nodes.flatMap((n) => renderBlockElement(n));
	const lines = collapseBlankLines(content);
	const markdown = `${lines.join("\n\n").trim()}\n`;

	const outputPath = path.join(bookDir, outputFileName);
	fs.writeFileSync(outputPath, markdown, "utf8");
}
