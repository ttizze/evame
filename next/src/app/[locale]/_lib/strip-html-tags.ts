import createDOMPurify from "isomorphic-dompurify";

export function stripHtmlTags(html: string) {
	return createDOMPurify
		.sanitize(html, {
			ALLOWED_TAGS: [],
			ALLOWED_ATTR: [],
		})
		.trim();
}
