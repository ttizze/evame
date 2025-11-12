import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { DOMParser } from "@xmldom/xmldom";
import { afterEach, describe, expect, test } from "vitest";
import { getFileData } from "../books";
import { convertXmlFileToMarkdown } from "../cli";
import { writeBookMarkdown } from "../render";
import { ELEMENT_NODE, getChildElements, TEXT_NODE } from "../tei";
import type { BookDoc } from "../types";

// このテストファイルは convert-romn-to-md-nosplit の書籍変換フロー全体を確認する。
// - writeBookMarkdown が期待どおりの Markdown を生成し、分類ディレクトリ配下に配置される
// - convertXmlFileToMarkdownNoSplit が books.json の分類に沿った単一 Markdown 出力と例外処理を行う
// これらを押さえて分割なし変換の退行を防ぐ。

const tempDirs: string[] = [];

// テスト用の一時ディレクトリを確保し、後始末できるよう記録しておく。
function createTempDir(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

// 指定ディレクトリ以下から対象 Markdown を収集し、生成漏れを検出する。
function collectMarkdownFiles(root: string, fileName: string): string[] {
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

// XML 内のテキストノードを列挙し、空白を正規化した文字列として収集する。
function collectTextFragments(node: Node, fragments: string[]): void {
	if (node.nodeType === TEXT_NODE) {
		const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
		if (text.length > 0) {
			fragments.push(text);
		}
		return;
	}
	if (node.nodeType === ELEMENT_NODE) {
		for (let child = node.firstChild; child; child = child.nextSibling) {
			collectTextFragments(child, fragments);
		}
	}
}

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function normalizeFragmentText(value: string): string {
	return normalizeWhitespace(value).replace(/`+/g, "");
}

function stripMarkdownFormatting(markdown: string): string {
	const withoutCodeFenceMarkers = markdown.replace(
		/```[\s\S]*?```/g,
		(block) => {
			const inner = block.replace(/^```.*?\n?/, "").replace(/```$/, "");
			return ` ${inner} `;
		},
	);
	const withoutInlineCode = withoutCodeFenceMarkers.replace(/`([^`]*)`/g, "$1");
	const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)]\([^)]+\)/g, "$1");
	const withoutBold = withoutLinks
		.replace(/\*\*(.*?)\*\*/g, "$1")
		.replace(/__(.*?)__/g, "$1");
	const withoutItalic = withoutBold
		.replace(/\*(.*?)\*/g, "$1")
		.replace(/_(.*?)_/g, "$1")
		.replace(/~~(.*?)~~/g, "$1");
	const withoutInlineTicks = withoutItalic.replace(/`+/g, "");
	const withoutHtml = withoutInlineTicks.replace(/<[^>]+>/g, " ");
	return normalizeWhitespace(withoutHtml);
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop();
		if (dir) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}
});

describe("writeBookMarkdown", () => {
	// 分類パス配下へ Markdown が生成され、主要要素が期待どおり整形されるか検証する。
	test("分類ディレクトリへ書籍 Markdown を出力する", () => {
		const parser = new DOMParser();
		const xml = `
			<body>
				<head rend="nikaya">ニカーヤ見出し</head>
				<p rend="book">書籍の説明</p>
				<div>
					<head rend="chapter">第一章</head>
				<p rend="gatha1">詩句ラインA</p>
				<p rend="bodytext" n="12">導入文 <hi rend="bold">強調</hi> と <hi rend="italics">斜体</hi> を含む。</p>
				<p>本文段落。</p>
				</div>
			</body>
		`;
		const document = parser.parseFromString(xml, "application/xml");
		const body = document.getElementsByTagName("body").item(0);
		expect(body).not.toBeNull();
		if (!body) {
			throw new Error("<body> 要素が存在しません");
		}
		const doc: BookDoc = {
			nodes: getChildElements(body),
			dirSegments: ["01-テスト分類", "02-サンプル書籍"],
		};
		const outputDir = createTempDir("nosplit-render-");

		writeBookMarkdown(doc, outputDir, "sample.md");

		const expectedPath = path.join(
			outputDir,
			"01-テスト分類",
			"02-サンプル書籍",
			"sample.md",
		);
		expect(fs.existsSync(expectedPath)).toBe(true);
		const content = fs.readFileSync(expectedPath, "utf8").trim();
		expect(content).toMatch(/^#\sニカーヤ見出し$/m);
		expect(content).toMatch(/^##\s書籍の説明$/m);
		expect(content).toMatch(/^###\s第一章$/m);
		expect(content).toMatch(/^\*詩句ラインA\*$/m);
		expect(content).toContain("導入文 **強調** と _斜体_ を含む。");
		expect(content.endsWith("本文段落。")).toBe(true);
	});

	// tipitaka-latn.xsl に登場する主な rend を網羅し、Markdown 化の挙動が維持されているか検証する。
	test("XSL由来の各種 rend 属性をまとめて検証する", () => {
		const parser = new DOMParser();
		const xml = `
			<body>
				<head rend="nikaya">ニカーヤ見出し</head>
				<head rend="book">書籍見出し</head>
				<head rend="chapter">章見出し</head>
				<head rend="title">タイトル</head>
				<p rend="subhead">サブ見出し</p>
				<p rend="subsubhead">小見出し</p>
				<p rend="centre">中央寄せの行</p>
				<p rend="bodytext" n="12"><hi rend="paranum">123</hi><hi rend="dot">.</hi> 本文 <hi rend="bold">太字</hi> <hi rend="italics">斜体</hi></p>
				<p rend="indent">インデント <hi rend="hit" id="hit1">ヒット</hi></p>
				<p rend="unindented">インデントなし</p>
				<p rend="hangnum" n="33">ぶら下げ番号</p>
				<p rend="gatha1">詩句1</p>
				<p rend="gatha2">詩句2</p>
				<p rend="gatha3">詩句3</p>
				<p rend="gathalast">詩句4</p>
				<pb ed="vri" n="123" />
			</body>
		`;
		const document = parser.parseFromString(xml, "application/xml");
		const body = document.getElementsByTagName("body").item(0);
		expect(body).not.toBeNull();
		if (!body) {
			throw new Error("<body> 要素が存在しません");
		}
		const doc: BookDoc = {
			nodes: getChildElements(body),
			dirSegments: ["01-レンダリング検証"],
		};
		const outputDir = createTempDir("nosplit-xsl-");

		writeBookMarkdown(doc, outputDir, "patterns.md");

		const outputPath = path.join(
			outputDir,
			"01-レンダリング検証",
			"patterns.md",
		);
		expect(fs.existsSync(outputPath)).toBe(true);
		const content = fs.readFileSync(outputPath, "utf8");

		expect(content).toMatch(/^#\sニカーヤ見出し$/m);
		expect(content).toMatch(/^##\s書籍見出し$/m);
		expect(content).toMatch(/^###\s章見出し$/m);
		expect(content).toMatch(/^####\sタイトル$/m);
		expect(content).toMatch(/^####\sサブ見出し$/m);
		expect(content).toMatch(/^####\s小見出し$/m);

		expect(content).toContain("::centre\n中央寄せの行\n::");
		expect(content).toContain("123. 本文 **太字** _斜体_");
		expect(content).toContain(
			'::indent\nインデント <hi rend="hit" id="hit1">ヒット</hi>\n::',
		);
		expect(content).toContain("::unindented\nインデントなし\n::");
		expect(content).toContain("::hangnum\nぶら下げ番号\n::");

		expect(content).toMatch(/^\*詩句1\*$/m);
		expect(content).toMatch(/^\*詩句2\*$/m);
		expect(content).toMatch(/^\*詩句3\*$/m);
		expect(content).toMatch(/^\*詩句4\*$/m);
		expect(content).toContain('<pb ed="vri" n="123" />');
	});
});

describe("convertXmlFileToMarkdownNoSplit", () => {
	// 実際の ROMN XML を 1 書籍 1 Markdown として出力し、分類パスが維持されることを確認する。
	test("ROMN XML を単一 Markdown に変換する", async () => {
		const sampleFile = path.resolve(
			process.cwd(),
			"tipitaka-xml",
			"romn",
			"abh01m.mul.xml",
		);
		expect(fs.existsSync(sampleFile)).toBe(true);
		const outputDir = createTempDir("nosplit-convert-");

		await convertXmlFileToMarkdown(sampleFile, outputDir);

		const classification = getFileData(path.basename(sampleFile).toLowerCase());
		const outputFileName = `${path.basename(
			sampleFile,
			path.extname(sampleFile),
		)}.md`;
		const expectedDir = path.join(outputDir, ...classification.dirSegments);
		const expectedFile = path.join(expectedDir, outputFileName);
		expect(fs.existsSync(expectedFile)).toBe(true);
		const markdownFiles = collectMarkdownFiles(outputDir, outputFileName);
		expect(markdownFiles).toHaveLength(1);
		const text = fs.readFileSync(expectedFile, "utf8").trim();
		expect(text.length).toBeGreaterThan(0);
		expect(text).toMatch(/^#\s.+/m);
	});

	// XML のテキストノードがすべて Markdown 出力に含まれているか確認し、行落ちを防ぐ。
	test("ROMN XML の本文テキストが Markdown に保持される", async () => {
		const sampleFile = path.resolve(
			process.cwd(),
			"tipitaka-xml",
			"romn",
			"abh01m.mul.xml",
		);
		expect(fs.existsSync(sampleFile)).toBe(true);
		const outputDir = createTempDir("nosplit-text-");

		await convertXmlFileToMarkdown(sampleFile, outputDir);

		const classification = getFileData(path.basename(sampleFile).toLowerCase());
		const outputFileName = `${path.basename(
			sampleFile,
			path.extname(sampleFile),
		)}.md`;
		const outputPath = path.join(
			outputDir,
			...classification.dirSegments,
			outputFileName,
		);
		expect(fs.existsSync(outputPath)).toBe(true);
		const markdown = fs.readFileSync(outputPath, "utf8");
		const plainMarkdown = stripMarkdownFormatting(markdown);

		const parser = new DOMParser({ errorHandler: () => undefined });
		const xmlContent = fs.readFileSync(sampleFile, "utf16le");
		const document = parser.parseFromString(xmlContent, "application/xml");
		const body = document.getElementsByTagName("body").item(0);
		expect(body).not.toBeNull();
		if (!body) {
			throw new Error("<body> 要素が存在しません");
		}

		const fragments: string[] = [];
		collectTextFragments(body, fragments);
		expect(fragments.length).toBeGreaterThan(0);

		let cursor = 0;
		for (const fragment of fragments) {
			const normalized = normalizeFragmentText(fragment);
			if (!normalized) continue;
			const position = plainMarkdown.indexOf(normalized, cursor);
			if (position < 0) {
				throw new Error(`Markdown 出力から断片が見つかりません: ${fragment}`);
			}
			cursor = position + normalized.length;
		}
	});

	// 全 ROMN XML を変換し、生成結果が既存 nosplit 出力と行単位で一致するか確認する。
	test("ROMN XML 全件で Markdown を生成し既存出力との差異がない", async () => {
		const romnDir = path.resolve(process.cwd(), "tipitaka-xml", "romn");
		const baselineDir = path.resolve(process.cwd(), "tipitaka-md-nosplit");
		expect(fs.existsSync(romnDir)).toBe(true);
		expect(fs.existsSync(baselineDir)).toBe(true);

		const xmlFiles = fs
			.readdirSync(romnDir)
			.filter((name) => name.toLowerCase().endsWith(".xml"))
			.sort();
		expect(xmlFiles.length).toBeGreaterThan(0);

		const outputDir = createTempDir("nosplit-all-");

		for (const name of xmlFiles) {
			const filePath = path.join(romnDir, name);
			// 一括変換と同じ条件で順次変換し、負荷を抑える。
			// eslint-disable-next-line no-await-in-loop
			await convertXmlFileToMarkdown(filePath, outputDir);
		}

		const normalize = (text: string): string =>
			text.replace(/\r\n/g, "\n").trimEnd();

		for (const name of xmlFiles) {
			const lower = name.toLowerCase();
			const { dirSegments } = getFileData(lower);
			const outputFileName = `${path.basename(name, path.extname(name))}.md`;
			const outputFile = path.join(outputDir, ...dirSegments, outputFileName);
			expect(fs.existsSync(outputFile)).toBe(true);

			const baselineFile = path.join(
				baselineDir,
				...dirSegments,
				outputFileName,
			);
			expect(fs.existsSync(baselineFile)).toBe(true);

			const actualLines = normalize(fs.readFileSync(outputFile, "utf8")).split(
				"\n",
			);
			const expectedLines = normalize(
				fs.readFileSync(baselineFile, "utf8"),
			).split("\n");
			expect(actualLines).toEqual(expectedLines);

			const markdown = fs.readFileSync(outputFile, "utf8");
			const plainMarkdown = stripMarkdownFormatting(markdown);
			const xmlPath = path.join(romnDir, name);
			const xmlContent = fs.readFileSync(xmlPath, "utf16le");
			const parser = new DOMParser({ errorHandler: () => undefined });
			const document = parser.parseFromString(xmlContent, "application/xml");
			const body = document.getElementsByTagName("body").item(0);
			expect(body).not.toBeNull();
			if (!body) {
				throw new Error(`<body> 要素が存在しません: ${name}`);
			}
			const fragments: string[] = [];
			collectTextFragments(body, fragments);
			expect(fragments.length).toBeGreaterThan(0);
			let cursor = 0;
			for (const fragment of fragments) {
				const normalizedFragment = normalizeFragmentText(fragment);
				if (!normalizedFragment) continue;
				const position = plainMarkdown.indexOf(normalizedFragment, cursor);
				if (position < 0) {
					throw new Error(
						`Markdown 出力から断片が見つかりません (${name}): ${fragment}`,
					);
				}
				cursor = position + normalizedFragment.length;
			}
		}
	}, 120_000);

	// <body> が複数存在する不正 XML を検出し、エラーが投げられることを確認する。
	test("複数 <body> を含む XML で例外を投げる", async () => {
		const xml = `<?xml version="1.0" encoding="UTF-16"?>
<root>
	<body><p>First</p></body>
	<body><p>Second</p></body>
</root>`;
		const tempInputDir = createTempDir("nosplit-multibody-src-");
		const filePath = path.join(tempInputDir, "abh01m.mul.xml");
		fs.writeFileSync(filePath, xml, "utf16le");
		const outputDir = createTempDir("nosplit-multibody-out-");

		await expect(convertXmlFileToMarkdown(filePath, outputDir)).rejects.toThrow(
			/Multiple <body>/,
		);
	});
});
