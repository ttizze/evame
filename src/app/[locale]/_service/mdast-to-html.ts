import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Json } from "@/db/types";

export async function mdastToHtml({ mdastJson }: { mdastJson: Json }) {
	if (!mdastJson || Object.keys(mdastJson).length === 0) {
		return { html: "" };
	}

	/* 1. mdastJson は plain object なのでそのまま cast -------------- */
	const mdast = mdastJson;

	const processor = unified()
		.use(remarkRehype, { allowDangerousHtml: true }) // mdast → hast
		.use(rehypeStringify, { allowDangerousHtml: true });

	const hast = await processor.run(mdast); // ✅ parser 不要
	const html = processor.stringify(hast); // stringify だけ実行

	return { html: String(html) };
}
