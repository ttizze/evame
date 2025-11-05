import * as fs from "node:fs";
import * as path from "node:path";
import {
	getChildElements,
	normalizeTagName,
	renderInlineChildren,
	renderInlineElementToString,
	stringifyAttributes,
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

const GATHA_RENDS = new Set(["gatha1", "gatha2", "gatha3", "gathalast"]);

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

function renderBlockElement(node: Element): string[] {
	const tag = normalizeTagName(node.tagName);
	const rend = (node.getAttribute("rend") ?? "").toLowerCase();

	switch (tag) {
		case "div":
			return getChildElements(node).flatMap((child) =>
				renderBlockElement(child),
			);
		case "head": {
			const level = REND_HEADING_LEVELS[rend] ?? 3;
			return [renderHeading(node, level)];
		}
		case "p": {
			if (rend in REND_HEADING_LEVELS) {
				return [renderHeading(node, REND_HEADING_LEVELS[rend])];
			}
			if (rend && GATHA_RENDS.has(rend)) {
				const content = renderInlineChildren(node).trim();
				return [`\`\`\`\n${content}\n\`\`\``];
			}
			const excludeAttrs = new Set(["n"]);
			if (rend === "bodytext" || rend === "centre") {
				excludeAttrs.add("rend");
			}
			const rawAttrs = Array.from(node.attributes ?? []).filter(
				({ name }) => !excludeAttrs.has(name),
			);
			const attrs = stringifyAttributes(rawAttrs);
			const content = renderInlineChildren(node).trim();
			if (!attrs) return [content];
			return [`<p${attrs}>${content}</p>`];
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
