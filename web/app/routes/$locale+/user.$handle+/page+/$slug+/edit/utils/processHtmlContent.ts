import type { PageStatus } from "@prisma/client";
import type { Element, Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Plugin } from "unified";
import type { VFile } from "vfile";
import { collectBlocksAndSegmentsFromRoot } from "../../utils/process-html";
import type { BlockInfo } from "../../utils/process-html";
import {
	synchronizePageSourceTexts,
	upsertPageWithHtml,
} from "../functions/mutations.server";

function injectSpanNodes(blocks: BlockInfo[], hashToId: Map<string, number>) {
	for (const block of blocks) {
		const sourceTextId = hashToId.get(block.textAndOccurrenceHash);
		if (!sourceTextId) continue;

		const spanNode: Element = {
			type: "element",
			tagName: "span",
			properties: {
				"data-source-text-id": sourceTextId.toString(),
			},
			children: block.element.children,
		};

		block.element.children = [spanNode];
	}
}
export function rehypeAddDataId(
	pageId: number,
	title: string,
): Plugin<[], Root> {
	return function attacher() {
		return async (tree: Root, file: VFile) => {
			const { blocks, segments } = collectBlocksAndSegmentsFromRoot(
				tree,
				title,
			);

			const hashToId = await synchronizePageSourceTexts(pageId, segments);

			injectSpanNodes(blocks, hashToId);
		};
	};
}

// 例） HTML → HAST → MDAST → remark → HAST → HTML の流れで使う想定
export async function processPageHtml(
	title: string,
	html: string,
	pageSlug: string,
	userId: number,
	sourceLanguage: string,
	status: PageStatus,
) {
	// HTML 入力に対応する page レコードを作成/更新
	const page = await upsertPageWithHtml(
		pageSlug,
		html,
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
		.process(html);

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
