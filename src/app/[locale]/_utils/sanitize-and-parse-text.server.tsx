import parse from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";
import type { ReactNode } from "react";

export function sanitizeAndParseText(text: string): ReactNode {
	const sanitized = DOMPurify.sanitize(
		text.replace(/(\r\n|\n|\\n)/g, "<br />"),
	);
	return parse(sanitized);
}
