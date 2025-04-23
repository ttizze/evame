import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash";
import { remarkHashAndSegments } from "@/app/[locale]/_lib/remark-hash";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { VFile } from "vfile";

// 例） HTML → HAST →MDAST → HAST → HTML の流れで使う想定
export async function annotateHtmlWithSegments(p: {
	header?: string;
	html: string;
}) {
	const file = (await unified()
		.use(rehypeParse, { fragment: true }) // HTML → HAST
		.use(rehypeRemark) // HAST → MDAST
		.use(remarkHashAndSegments(p.header)) // ★ hash + segments + hProperties
		.use(remarkRehype) // MDAST → HAST (hProperties → 属性)
		.use(rehypeStringify, { allowDangerousHtml: true }) // HAST → HTML
		.process(p.html)) as VFile & {
		data: { segments: SegmentDraft[] };
	};

	return { annotatedHtml: String(file), segments: file.data.segments };
}
