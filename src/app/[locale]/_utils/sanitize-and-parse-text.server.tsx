import parse from "html-react-parser";
import type { ReactNode } from "react";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

function normalizeInlineHtml(text: string): string {
	// Avoid invalid nested block tags when this content is rendered inside
	// <p>/<h*> etc via `WrapSegment`/`SegmentElement` (prevents hydration mismatch).
	const withBreaks = text.replace(/(\r\n|\n|\\n)/g, "<br />");
	const unwrappedBlockTags = withBreaks.replace(
		/<\/?(?:p|h[1-6]|li|td|th|blockquote)\b[^>]*>/gi,
		(tag) => (tag.startsWith("</") ? "<br />" : ""),
	);
	// Collapse duplicate line breaks introduced by stripping wrappers.
	return unwrappedBlockTags.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br /><br />");
}

const processor = unified()
	.use(rehypeParse, { fragment: true })
	.use(rehypeSanitize)
	.use(rehypeStringify);

export function sanitizeAndParseText(text: string): ReactNode {
	const normalized = normalizeInlineHtml(text);
	const sanitized = processor.processSync(normalized).toString();
	return parse(sanitized);
}
