import * as fs from "node:fs";
import * as path from "node:path";

import { DOMParser } from "@xmldom/xmldom";
import { getFileData } from "./books";
import { writeBookMarkdown } from "./render";
import { getChildElements } from "./tei";
import type { BookDoc } from "./types";

const fsPromises = fs.promises;

// 単一 XML をチャプター分割せずに 1 ファイルの Markdown へ変換
export async function convertXmlFileToMarkdown(
	filePath: string,
	outputDir: string,
): Promise<void> {
	const xmlContent = await fsPromises.readFile(filePath, "utf16le");
	const parser = new DOMParser({ errorHandler: () => undefined });
	const document = parser.parseFromString(xmlContent, "application/xml");
	const bodies = document.getElementsByTagName("body");
	const body = bodies.item(0);
	if (!body) throw new Error(`No <body> found in ${filePath}`);
	if (bodies.length > 1)
		throw new Error(`Multiple <body> found in ${filePath}`);

	const lower = path.basename(filePath).toLowerCase();
	const own = getFileData(lower);

	// 章概念を持たない単純なドキュメント（書籍単位）を構築
	const doc: BookDoc = {
		nodes: getChildElements(body),
		dirSegments: [...own.dirSegments],
	};

	const outputFileName = `${path.basename(filePath, path.extname(filePath))}.md`;
	writeBookMarkdown(doc, outputDir, outputFileName);
}

// 入力ディレクトリ配下の XML を列挙して逐次変換
export async function runConversionCliNoSplit(): Promise<void> {
	const inputDir = path.resolve(process.cwd(), "tipitaka-xml/romn");
	// 既存の分割版と混ざらないよう、出力ルートを分ける
	const outputDir = path.resolve(process.cwd(), "tipitaka-md");

	// 既存の出力ディレクトリを削除してから再作成
	if (fs.existsSync(outputDir)) {
		await fsPromises.rm(outputDir, { recursive: true, force: true });
	}
	await fsPromises.mkdir(outputDir, { recursive: true });

	const xmlFiles = (await fsPromises.readdir(inputDir, { withFileTypes: true }))
		.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".xml"))
		.map((e) => e.name);

	for (const name of xmlFiles) {
		const filePath = path.join(inputDir, name);
		await convertXmlFileToMarkdown(filePath, outputDir);
	}
}
