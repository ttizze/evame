import type { PageStatus } from "@prisma/client";
import type { Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import rehypeUnwrapImages from "rehype-unwrap-images";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Plugin } from "unified";
import { collectBlocksFromRoot } from "../../lib/process-html";
import { injectSpanNodes } from "../../lib/process-html";
import {
	synchronizePagePageSegments,
	upsertPageWithHtml,
} from "../functions/mutations.server";

export function rehypeAddDataId(
	pageId: number,
	title: string,
): Plugin<[], Root> {
	return function attacher() {
		return async (tree: Root) => {
			const blocks = collectBlocksFromRoot(tree, title);
			await synchronizePagePageSegments(pageId, blocks);
			injectSpanNodes(blocks);
		};
	};
}

// 例） HTML → HAST → MDAST → remark → HAST → HTML の流れで使う想定
export async function processPageHtml(
	title: string,
	html: string,
	pageSlug: string,
	userId: string,
	sourceLocale: string,
	status: PageStatus,
) {
	// HTML 入力に対応する page レコードを作成/更新
	const page = await upsertPageWithHtml(
		pageSlug,
		html,
		userId,
		sourceLocale,
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
	await upsertPageWithHtml(pageSlug, htmlContent, userId, sourceLocale, status);
	return page;
}
