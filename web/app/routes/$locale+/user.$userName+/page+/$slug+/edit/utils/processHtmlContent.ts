import type { PageStatus } from "@prisma/client";
import type { Element, Properties, Root, RootContent, Text } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Plugin } from "unified";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import {
	synchronizePageSourceTexts,
	upsertPageWithHtml,
} from "../functions/mutations.server";
import { generateHashForText } from "./generateHashForText";
const BLOCK_LEVEL_TAGS = new Set([
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"blockquote",
	"div",
	"section",
	"article",
	"td",
	"th",
	// 必要に応じて追加
]);

/**
 * 与えられたノード配下のテキストをすべて連結して返す。
 */
function extractTextFromHAST(node: Parent): string {
	let result = "";
	visit(node, "text", (textNode: RootContent) => {
		if (textNode.type === "text") {
			const trimmedText = (textNode as Text).value.trim();
			if (trimmedText) {
				// 空白で連結
				result += result ? ` ${trimmedText}` : trimmedText;
			}
		}
	});
	return result;
}

/**
 * ノードがブロックレベルの子要素を一つでも持つかどうかを判定する。
 */
function hasBlockLevelChild(node: Element): boolean {
	return node.children.some((child) => {
		return child.type === "element" && BLOCK_LEVEL_TAGS.has(child.tagName);
	});
}

export function rehypeAddDataId(
	pageId: number,
	title: string,
): Plugin<[], Root> {
	return function attacher() {
		return async (tree: Root, file: VFile) => {
			const textOccurrenceMap = new Map<string, number>();

			interface BlockInfo {
				element: Element;
				text: string;
				textAndOccurrenceHash: string;
			}

			const blocks: BlockInfo[] = [];

			// 全ての element ノードを訪問
			visit(tree, "element", (node: Element) => {
				if (BLOCK_LEVEL_TAGS.has(node.tagName) && !hasBlockLevelChild(node)) {
					const blockText = extractTextFromHAST(node);
					if (!blockText) return;

					const currentCount = (textOccurrenceMap.get(blockText) ?? 0) + 1;
					textOccurrenceMap.set(blockText, currentCount);

					const hash = generateHashForText(blockText, currentCount);

					blocks.push({
						element: node,
						text: blockText,
						textAndOccurrenceHash: hash,
					});
				}
			});

			const allTextsForDb = blocks.map((block, index) => ({
				text: block.text,
				textAndOccurrenceHash: block.textAndOccurrenceHash,
				number: index + 1,
			}));

			allTextsForDb.push({
				text: title,
				textAndOccurrenceHash: generateHashForText(title, 0),
				number: 0,
			});

			// DB 側のテキスト一覧を同期して ID を取得
			const hashToId = await synchronizePageSourceTexts(pageId, allTextsForDb);

			// 各ブロック要素を <span data-source-text-id="..."> で子要素を包む
			for (const block of blocks) {
				const sourceTextId = hashToId.get(block.textAndOccurrenceHash);
				if (!sourceTextId) continue;

				const spanNode: Element = {
					type: "element",
					tagName: "span",
					properties: {
						"data-source-text-id": sourceTextId.toString(),
					} as Properties,
					children: block.element.children,
				};

				block.element.children = [spanNode];
			}
		};
	};
}

// 例） HTML → HAST → MDAST → remark → HAST → HTML の流れで使う想定
export async function processHtmlContent(
	title: string,
	htmlInput: string,
	pageSlug: string,
	userId: number,
	sourceLanguage: string,
	status: PageStatus,
) {
	// HTML 入力に対応する page レコードを作成/更新
	const page = await upsertPageWithHtml(
		pageSlug,
		htmlInput,
		userId,
		sourceLanguage,
		status,
	);

	const file = await unified()
		.use(rehypeParse, { fragment: true }) // HTML→HAST
		.use(rehypeRemark) // HAST→MDAST
		.use(remarkGfm) // GFM拡張
		.use(remarkRehype, { allowDangerousHtml: true }) // MDAST→HAST
		.use(rehypeAddDataId(page.id, title))
		.use(rehypeRaw)
		.use(rehypeUnwrapImages)
		.use(rehypeStringify, { allowDangerousHtml: true }) // HAST→HTML
		.process(htmlInput);

	const htmlContent = String(file);
	await upsertPageWithHtml(
		pageSlug,
		htmlContent,
		userId,
		sourceLanguage,
		status,
	);
	return page;
}
