"use client";
import DOMPurify from "dompurify";
import parse from "html-react-parser";

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

export function sanitizeAndParseText(text: string): React.ReactNode {
	const sanitized = DOMPurify.sanitize(normalizeInlineHtml(text));
	return parse(sanitized);
}
