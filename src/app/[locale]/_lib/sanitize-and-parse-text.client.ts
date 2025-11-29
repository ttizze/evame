"use client";
import parse from "html-react-parser";

export async function sanitizeAndParseText(
	text: string,
): Promise<React.ReactNode> {
	const DOMPurify = (await import("isomorphic-dompurify")).default;
	const sanitized = DOMPurify.sanitize(
		text.replace(/(\r\n|\n|\\n)/g, "<br />"),
	);
	return parse(sanitized);
}
