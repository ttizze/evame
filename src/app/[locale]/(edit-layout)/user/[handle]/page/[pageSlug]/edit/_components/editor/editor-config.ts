import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import { FileHandler } from "@tiptap-pro/extension-file-handler";
import { Markdown } from "tiptap-markdown";
import { CustomImage } from "./custom-image";
import { X } from "./extensions/x-embed";
import { handleFileUpload } from "./use-file-upload";

const PARAGRAPH_BREAK_RE = /(?:<br\b[^>]*>\s*){2,}/gi;
const EMPTY_PARAGRAPH_RE = /<p[^>]*>(?:\s|&nbsp;|<br\b[^>]*>)*<\/p>/gi;
const TRAILING_BREAK_RE =
	/<br\b[^>]*class=["'][^"']*ProseMirror-trailingBreak[^"']*["'][^>]*>/gi;
const BLOCK_TAG_RE =
	/<(?:blockquote|p|div|section|article|aside|figure|figcaption|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|pre|h[1-6])/i;
const PARAGRAPH_TAG_RE = /<p[\s>]/i;

function splitInlineIntoParagraphs(html: string) {
	const segments = html
		.split(PARAGRAPH_BREAK_RE)
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);

	if (segments.length === 0) {
		return "<p></p>";
	}

	return segments.map((segment) => `<p>${segment}</p>`).join("");
}

export function configureEditor(initialContent: string, placeholder: string) {
	return {
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: { levels: [2, 3, 4] },
				code: {
					HTMLAttributes: {
						class: "bg-gray-200 dark:bg-gray-900 rounded-md p-1 text-sm",
					},
				},
			}),
			Markdown.configure({
				html: true,
				transformPastedText: true,
			}),
			Link.configure({
				autolink: true,
			}),
			Placeholder.configure({
				placeholder: placeholder,
			}),
			CustomImage,
			X,
			FileHandler.configure({
				allowedMimeTypes: [
					"image/png",
					"image/jpeg",
					"image/gif",
					"image/webp",
				],
				onDrop: (currentEditor, files, pos) => {
					for (const file of files) {
						handleFileUpload(file, currentEditor, pos);
					}
				},
				onPaste: (currentEditor, files, htmlContent) => {
					for (const file of files) {
						if (htmlContent) {
							return false;
						}
						handleFileUpload(file, currentEditor);
					}
				},
			}),
		],
		content: initialContent,
		editorProps: {
			transformPastedHTML(html: string) {
				const trimmed = html?.trim() ?? "";
				if (!trimmed) return "<p></p>";

				const withoutTrailingBreaks = trimmed.replace(TRAILING_BREAK_RE, "");
				const withoutEmptyParagraphs = withoutTrailingBreaks.replace(
					EMPTY_PARAGRAPH_RE,
					"",
				);

				if (!withoutEmptyParagraphs) {
					return "<p></p>";
				}

				const hasBlockElements = BLOCK_TAG_RE.test(withoutEmptyParagraphs);

				if (!hasBlockElements) {
					return splitInlineIntoParagraphs(withoutEmptyParagraphs);
				}

				if (PARAGRAPH_TAG_RE.test(withoutEmptyParagraphs)) {
					return withoutEmptyParagraphs.replace(PARAGRAPH_BREAK_RE, "</p><p>");
				}

				return withoutEmptyParagraphs;
			},
			attributes: {
				class: "focus:outline-hidden",
			},
		},
	};
}
