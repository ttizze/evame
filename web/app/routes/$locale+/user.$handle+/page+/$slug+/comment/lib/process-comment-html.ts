import type { Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { collectBlocksAndSegmentsFromRoot } from "../../utils/process-html";
import { createPageCommentSegments } from "../functions/mutations.server";

export function parseHtmlToAst(html: string): Root {
	return unified().use(rehypeParse, { fragment: true }).parse(html) as Root;
}

export async function processCommentHtml(
	commentId: number,
	commentHtml: string,
): Promise<string> {
	// 1. セグメントを抽出
	const { segments } = collectBlocksAndSegmentsFromRoot(
		parseHtmlToAst(commentHtml),
	);
	// 2. DB書き込み
	await createPageCommentSegments(commentId, segments);

	const file = await unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeStringify)
		.process(commentHtml);

	return String(file);
}
