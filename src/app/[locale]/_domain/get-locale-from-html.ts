import type { Element, Root, Text } from "hast";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/**
 * ISO 639-3 から ISO 639-1 への変換テーブル
 * francはISO 639-3（3文字）を返すため、アプリで使用するISO 639-1（2文字）に変換
 */
const iso639_3to1: Record<string, string> = {
	eng: "en",
	cmn: "zh", // Mandarin Chinese
	spa: "es",
	arb: "ar", // Standard Arabic
	por: "pt",
	fra: "fr",
	jpn: "ja",
	rus: "ru",
	deu: "de",
	vie: "vi",
	kor: "ko",
	tur: "tr",
	ita: "it",
	pes: "fa", // Iranian Persian
	tha: "th",
	pol: "pl",
	nld: "nl",
	tgl: "tl", // Tagalog
	hin: "hi",
};

/**
 * HTMLからテキストを抽出して言語を検出する
 * - code と a 要素は除外
 * - p, h1-h6, li, td, th 要素からテキストを抽出
 *
 * 使用ライブラリ: franc
 * - 純粋JavaScript、サーバーレス環境対応
 * - ISO 639-3コードを返すため変換が必要
 * - インドネシア語(id)は非サポート（マレー語として検出される）
 *
 * @see docs/adr/20260121-language-detection-library.md
 */
export async function getLocaleFromHtml(
	htmlContent: string,
	userLocale: string,
): Promise<string> {
	// HTMLをパースしてASTに変換
	const processor = unified().use(rehypeParse, { fragment: true });

	const tree = processor.parse(htmlContent);
	const processedTree = (await processor.run(tree)) as Root;

	// code と a 要素を削除
	removeCodeAndLinks(processedTree);

	// ブロック要素からテキストを抽出
	const contents = extractTextFromBlockElements(processedTree);

	try {
		const { franc } = await import("franc");
		const iso639_3 = franc(contents);

		if (iso639_3 === "und") {
			return userLocale;
		}

		const language = iso639_3to1[iso639_3];
		return language ?? userLocale;
	} catch (e) {
		console.error("Language detect error:", e);
		return userLocale;
	}
}

/**
 * code と a 要素を削除
 */
function removeCodeAndLinks(tree: Root): void {
	visit(tree, "element", (node: Element, index, parent) => {
		if (
			parent &&
			typeof index === "number" &&
			(node.tagName === "code" || node.tagName === "a")
		) {
			parent.children.splice(index, 1);
			return index; // 削除後はインデックスを調整
		}
	});
}

/**
 * ブロック要素からテキストを抽出
 */
function extractTextFromBlockElements(tree: Root): string {
	const textParts: string[] = [];
	const targetTags = new Set([
		"p",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"li",
		"td",
		"th",
	]);

	visit(tree, "element", (node: Element) => {
		if (targetTags.has(node.tagName)) {
			const text = extractTextFromNode(node);
			if (text.trim()) {
				textParts.push(text.trim());
			}
		}
	});

	return textParts.join("\n");
}

/**
 * ノードからテキストを再帰的に抽出
 */
function extractTextFromNode(node: Element | Text): string {
	if (node.type === "text") {
		return node.value ?? "";
	}
	if (node.type === "element" && node.children) {
		return node.children
			.map((child) => extractTextFromNode(child as Element | Text))
			.join("");
	}
	return "";
}
