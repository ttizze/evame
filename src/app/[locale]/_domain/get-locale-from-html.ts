import { loadModule } from "cld3-asm";
import type { Element, Root, Text } from "hast";
import rehypeParse from "rehype-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/**
 * HTMLからテキストを抽出して言語を検出する
 * - code と a 要素は除外
 * - p, h1-h6, li, td, th 要素からテキストを抽出
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

	let cld = null;
	try {
		cld = (await loadModule()).create();
		const { language = "und" } = cld.findLanguage(contents);
		return language !== "und" ? language : userLocale;
	} catch (e) {
		console.error("Language detect error:", e);
		return userLocale;
	} finally {
		cld?.dispose(); // ← 生成されていれば必ず解放
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
