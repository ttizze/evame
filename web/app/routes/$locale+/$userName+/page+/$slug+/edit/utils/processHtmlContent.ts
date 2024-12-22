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
	upsertTitle,
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
	"td",
	"th",
]);

function extractTextFromHAST(node: Parent): string {
	let result = "";
	visit(node, "text", (textNode: RootContent) => {
		if (textNode.type === "text") {
			const trimmedText = (textNode as Text).value.trim();
			if (trimmedText) {
				result += result ? ` ${trimmedText}` : trimmedText;
			}
		}
	});
	return result;
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

			// 全ての"element"ノードを訪問
			visit(tree, "element", (node: Element) => {
				if (BLOCK_LEVEL_TAGS.has(node.tagName)) {
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

			const hashToId = await synchronizePageSourceTexts(pageId, allTextsForDb);

			// 各ブロック要素を<span data-id="...">で子要素全体を包む
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

//編集後も翻訳との結びつきを維持するために､textAndOccurrenceHashをキーにしてsourceTextsを更新する
//表示時はhtmlに埋め込まれたdata-source-text-idをkeyにしてsourceTextsを取得する
export async function processHtmlContent(
	title: string,
	htmlInput: string,
	pageSlug: string,
	userId: number,
	sourceLanguage: string,
	isPublished: boolean,
) {
	// HTML入力に対応するpageレコードを作成・更新
	const page = await upsertPageWithHtml(
		pageSlug,
		htmlInput,
		userId,
		sourceLanguage,
		isPublished,
	);
	// HTML → HAST → MDAST → remarkAddDataId適用 → HTMLへの変換

	const file = await unified()
		.use(rehypeParse, { fragment: true }) // HTMLをHASTに
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
		isPublished,
	);
	await upsertTitle(pageSlug, title);
	return page;
}
