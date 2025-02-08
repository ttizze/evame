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
import { upsertPageComment } from "../db/mutations.server";
import { createPageCommentSegments } from "../db/mutations.server";
export function parseHtmlToAst(html: string): Root {
	return unified().use(rehypeParse, { fragment: true }).parse(html) as Root;
}

export function rehypeAddDataId(commentId: number): Plugin<[], Root> {
	return function attacher() {
		return async (tree: Root) => {
			const blocks = collectBlocksFromRoot(tree);

			await createPageCommentSegments(commentId, blocks);
			injectSpanNodes(blocks);
		};
	};
}

// 例） HTML → HAST → MDAST → remark → HAST → HTML の流れで使う想定
export async function processPageCommentHtml(
	commentId: number,
	commentHtml: string,
	locale: string,
	userId: string,
	pageId: number,
) {
	// HTML 入力に対応する page レコードを作成/更新
	const pageComment = await upsertPageComment(
		commentId,
		commentHtml,
		locale,
		userId,
		pageId,
	);

	const file = await unified()
		.use(rehypeParse, { fragment: true }) // HTML→HAST
		.use(rehypeRemark) // HAST→MDAST
		.use(remarkGfm) // GFM拡張
		.use(remarkRehype, { allowDangerousHtml: true }) // MDAST→HAST
		.use(rehypeAddDataId(commentId))
		.use(rehypeRaw)
		.use(rehypeUnwrapImages)
		.use(rehypeStringify, { allowDangerousHtml: true }) // HAST→HTML
		.process(commentHtml);

	const injectedCommentHtml = String(file);
	await upsertPageComment(
		commentId,
		injectedCommentHtml,
		locale,
		userId,
		pageId,
	);
	return pageComment;
}
