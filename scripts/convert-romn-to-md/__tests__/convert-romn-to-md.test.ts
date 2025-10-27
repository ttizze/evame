import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { DOMParser } from "@xmldom/xmldom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getClassificationForFile } from "../../convert-romn-to-md-nosplit/books";
import { extractBodyFrontMatter, extractChapters } from "../chapters";
import { convertXmlFileToMarkdown } from "../cli";
import { resetChapterCounters, writeChapterMarkdown } from "../render";
import { getChildElements } from "../tei";
import type { Chapter } from "../types";

// このテストファイルは convert-romn-to-md の主な処理ラインを端から端まで検証する。
// - 章抽出のニュアンス（前書きの受け渡しや分類パス保持）
// - Markdown レンダリング時のディレクトリ構造と本文
// - 実 XML を通した end-to-end な章数・ファイル数の整合性
// を押さえて、変換漏れ／ファイル出力抜けが無いことを保証する。

const tempDirs: string[] = [];

// 一時ディレクトリを確保してテスト終了時に必ず破棄する。
function createTempDir(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

// 生成された Markdown ファイル (既定は index.md) を全階層から収集し、変換漏れを検査する。
function collectMarkdownFiles(
	root: string,
	fileName: string = "index.md",
): string[] {
	const entries = fs.readdirSync(root, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const entryPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectMarkdownFiles(entryPath, fileName));
		} else if (entry.isFile() && entry.name === fileName) {
			files.push(entryPath);
		}
	}
	return files;
}

// slugify をテスト内でも再現し、render 側と同じディレクトリ階層を検証できるようにする。
function slugify(input: string): string {
	const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	return (
		normalized
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "untitled"
	);
}

function applyOrder(slug: string, order?: number): string {
	if (!slug || order === undefined || Number.isNaN(order)) {
		return slug;
	}
	const prefix = order.toString().padStart(2, "0");
	return slug.startsWith(`${prefix}-`) ? slug : `${prefix}-${slug}`;
}

beforeEach(() => {
	resetChapterCounters();
});

afterEach(() => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop();
		if (dir) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}
});

describe("extractChapters", () => {
	// 章抽出の最小構成で、全体前書き＋book固有前書きが第1章にまとまるか検証する。
	// 章配列の数・タイトル・prefaceNodes の配分・分類パスの保持を網羅的にチェックする。
	test("distributes front matter and book preface to the first chapter", () => {
		const parser = new DOMParser();
		const xml = `
			<body>
				<p rend="nikaya">Nikaya Preface</p>
				<div type="book" n="Book 1">
					<head rend="book">Collected Writings</head>
					<p rend="book">Book Preface</p>
					<div rend="chapter">
						<head rend="chapter">First Chapter</head>
						<p>Body paragraph A.</p>
					</div>
					<div rend="chapter">
						<head rend="chapter">Second Chapter</head>
						<p>Body paragraph B.</p>
					</div>
					</div>
				</body>
			`;
		const document = parser.parseFromString(xml, "application/xml");
		const body = document.getElementsByTagName("body").item(0);
		expect(body).not.toBeNull();
		if (!body) {
			throw new Error("<body> 要素が存在しません");
		}
		const frontMatter = extractBodyFrontMatter(body);
		const chapters = extractChapters(body, "sample.xml");

		expect(chapters).toHaveLength(2);
		expect(frontMatter).toHaveLength(1);
		expect(chapters[0].prefaceNodes.length).toBeGreaterThanOrEqual(2);
		const prefaceTags = chapters[0].prefaceNodes.map((node) =>
			node.tagName.toLowerCase(),
		);
		expect(prefaceTags).toContain("p");
		expect(prefaceTags).toContain("head");
		expect(chapters[1].prefaceNodes).toHaveLength(0);
		expect(chapters[0].title).toBe("First Chapter");
		expect(chapters[1].title).toBe("Second Chapter");
		// dirSegments は CLI で付与されるため、ここでは検証しない
		expect(chapters[0].contentNodes).toHaveLength(1);
	});
});

describe("writeChapterMarkdown", () => {
	// Markdown 出力時に分類ディレクトリ → book スラグ → 通し番号付き章フォルダが作られるか確認する。
	// レンダリング結果に章見出しや前書きの Markdown 変換が含まれることも同時に検証する。
	test("writes markdown with classification-based directory structure", () => {
		const parser = new DOMParser();
		const xml = `
			<root>
				<preface>
					<p rend="book">Intro <hi rend="bold">bold</hi> text.</p>
				</preface>
				<content>
					<p>Regular paragraph.</p>
					<p rend="chapter">Sub Heading</p>
					<pb n="12" />
				</content>
			</root>
		`;
		const document = parser.parseFromString(xml, "application/xml");
		const preface = document.getElementsByTagName("preface").item(0);
		const content = document.getElementsByTagName("content").item(0);
		if (!preface || !content) {
			throw new Error("preface / content 要素が見つかりません");
		}
		const chapter: Chapter = {
			book: "Sample Book",
			title: "1. A Sample Chapter",
			order: 1,
			prefaceNodes: getChildElements(preface),
			contentNodes: getChildElements(content),
			dirSegments: ["01-nikaya", "02-division"],
		};
		const outputDir = createTempDir("render-chapter-");

		writeChapterMarkdown(chapter, outputDir);

		const classification = { dirSegments: ["01-nikaya", "02-division"] };
		const last =
			classification.dirSegments[classification.dirSegments.length - 1] ??
			"01-";
		const lastOrder = Number.parseInt(last.match(/^(\d{2,})-/)?.[1] ?? "1", 10);
		const bookSlug = applyOrder(slugify(chapter.book), lastOrder);
		const baseDir = path.join(
			outputDir,
			...classification.dirSegments,
			bookSlug,
		);
		expect(fs.existsSync(baseDir)).toBe(true);
		const chapterDirEntries = fs.readdirSync(baseDir);
		expect(chapterDirEntries).toContain("01-a-sample-chapter");
		const markdownPath = path.join(baseDir, "01-a-sample-chapter", "index.md");
		expect(fs.existsSync(markdownPath)).toBe(true);
		const contentText = fs.readFileSync(markdownPath, "utf8");
		expect(contentText).toContain("## 1. A Sample Chapter");
		expect(contentText).toContain("Intro **bold** text.");
		expect(contentText).toContain("<pb");
	});
});

describe("convertXmlFileToMarkdown", () => {
	// 実際のティーカー XML を選定して convertXmlFileToMarkdown を実行し、章数と生成された index.md 数が一致するか検証する。
	// 出力ファイルはいずれも非空で、最低限 Markdown 見出しを含むことまで確認し、全体フローの漏れを防ぐ。
	test("creates one markdown output per chapter for a sample XML", async () => {
		const sampleFile = path.resolve(
			process.cwd(),
			"tipitaka-xml",
			"romn",
			"abh01t.tik.xml",
		);
		expect(fs.existsSync(sampleFile)).toBe(true);
		const outputDir = createTempDir("convert-xml-");

		await convertXmlFileToMarkdown(sampleFile, outputDir);

		const xmlContent = fs.readFileSync(sampleFile, "utf16le");
		const parser = new DOMParser({ errorHandler: () => undefined });
		const document = parser.parseFromString(xmlContent, "application/xml");
		const body = document.getElementsByTagName("body").item(0);
		expect(body).not.toBeNull();
		if (!body) {
			throw new Error("サンプル XML に <body> が存在しません");
		}
		const classification = getClassificationForFile(
			path.basename(sampleFile).toLowerCase(),
		);
		const chapters = extractChapters(body, sampleFile);
		expect(chapters.length).toBeGreaterThan(0);
		const mdName = `${path.basename(sampleFile, path.extname(sampleFile))}.md`;
		const markdownFiles = collectMarkdownFiles(outputDir, mdName);
		const shouldSplit =
			Array.isArray(classification.chapterListTypes) &&
			classification.chapterListTypes.length > 0;
		const expectedCount = shouldSplit ? chapters.length : 1;
		expect(markdownFiles.length).toBe(expectedCount);
		for (const filePath of markdownFiles) {
			const text = fs.readFileSync(filePath, "utf8").trim();
			expect(text.length).toBeGreaterThan(0);
			expect(text).toMatch(/^##\s.+/m);
		}
	});

	test("handles book-structured XML and preserves classification directories", async () => {
		const sampleFile = path.resolve(
			process.cwd(),
			"tipitaka-xml",
			"romn",
			"vin02m4.mul.xml",
		);
		expect(fs.existsSync(sampleFile)).toBe(true);
		const outputDir = createTempDir("convert-book-xml-");

		await convertXmlFileToMarkdown(sampleFile, outputDir);

		const xmlContent = fs.readFileSync(sampleFile, "utf16le");
		const parser = new DOMParser({ errorHandler: () => undefined });
		const document = parser.parseFromString(xmlContent, "application/xml");
		const body = document.getElementsByTagName("body").item(0);
		expect(body).not.toBeNull();
		if (!body) {
			throw new Error("サンプル XML に <body> が存在しません");
		}

		const classification = getClassificationForFile(
			path.basename(sampleFile).toLowerCase(),
		);
		const chapters = extractChapters(body, sampleFile);
		expect(chapters.length).toBeGreaterThan(0);
		expect(classification.dirSegments.length).toBeGreaterThan(0);

		const mdName2 = `${path.basename(sampleFile, path.extname(sampleFile))}.md`;
		const markdownFiles = collectMarkdownFiles(outputDir, mdName2);
		expect(markdownFiles.length).toBe(chapters.length);
		for (const filePath of markdownFiles) {
			const text = fs.readFileSync(filePath, "utf8").trim();
			expect(text.length).toBeGreaterThan(0);
			expect(text).toMatch(/^##\s.+/m);
		}

		const dirSegments = classification.dirSegments;
		const last = dirSegments[dirSegments.length - 1] ?? "01-";
		const lastOrder = Number.parseInt(last.match(/^(\d{2,})-/)?.[1] ?? "1", 10);
		const bookSlug = applyOrder(slugify(chapters[0].book), lastOrder);
		const baseDir = path.join(outputDir, ...dirSegments, bookSlug);
		expect(fs.existsSync(baseDir)).toBe(true);
		const expectedRelative = path.relative(
			baseDir,
			path.dirname(markdownFiles[0] ?? ""),
		);
		expect(expectedRelative.startsWith("..")).toBe(false);
		const chapterDirEntries = fs.readdirSync(baseDir);
		expect(chapterDirEntries.some((entry) => /^\d{2}-/.test(entry))).toBe(true);
	});
});

describe("getClassificationForFile", () => {
	test("resolves dirSegments for every ROMN XML", () => {
		const romnDir = path.resolve(process.cwd(), "tipitaka-xml", "romn");
		expect(fs.existsSync(romnDir)).toBe(true);
		const entries = fs
			.readdirSync(romnDir)
			.filter((name) => name.toLowerCase().endsWith(".xml"));
		expect(entries.length).toBeGreaterThan(0);
		for (const entry of entries) {
			const { dirSegments } = getClassificationForFile(entry.toLowerCase());
			expect(Array.isArray(dirSegments)).toBe(true);
			expect(dirSegments.length).toBeGreaterThan(0);
			// 先頭2桁の順序プレフィックスを確認
			expect(dirSegments.every((d) => /^\d{2}-/.test(d))).toBe(true);
		}
	});
});
