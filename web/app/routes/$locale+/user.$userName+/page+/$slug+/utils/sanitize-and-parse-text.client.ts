import DOMPurify from "dompurify";
import parse from "html-react-parser";

export function sanitizeAndParseText(text: string): React.ReactNode {
	const sanitized = DOMPurify.sanitize(
		text.replace(/(\r\n|\n|\\n)/g, "<br />"),
	);
	return parse(sanitized);
}
