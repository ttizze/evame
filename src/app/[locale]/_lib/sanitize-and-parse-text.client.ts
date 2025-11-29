"use client";
import parse from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";

export function sanitizeAndParseText(text: string): React.ReactNode {
	const sanitized = DOMPurify.sanitize(
		text.replace(/(\r\n|\n|\\n)/g, "<br />"),
	);
	return parse(sanitized);
}