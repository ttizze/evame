import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

function looksLikeMarkdown(text: string): boolean {
	return (
		/^#{1,6}\s/.test(text) ||
		/\*\*[^*]+\*\*/.test(text) ||
		/\[.+\]\(.+\)/.test(text) ||
		/^[-*+]\s/.test(text) ||
		/^- \[[ xX]\]\s/.test(text) ||
		/^\|.+\|\s*$/.test(text) ||
		/^~~~|```/.test(text) ||
		/~~[^~]+~~/.test(text) ||
		/\[\^.+\]:/.test(text)
	);
}

export const shouldUseHtmlForMarkdown = (markdown: string): boolean => {
	return /\[\^.+\]:/.test(markdown) || /\[\^.+\]/.test(markdown);
};

export const markdownToHtml = (markdown: string): string => {
	const file = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.processSync(markdown);

	return String(file);
};

export const PasteMarkdown = Extension.create({
	name: "pasteMarkdown",
	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handlePaste: (_view, event) => {
						const text = event.clipboardData?.getData("text/plain");
						if (!text) return false;
						if (!looksLikeMarkdown(text)) return false;

						try {
							if (shouldUseHtmlForMarkdown(text)) {
								const html = markdownToHtml(text);
								this.editor.commands.insertContent(html);
								return true;
							}

							this.editor.commands.insertContent(text, {
								contentType: "markdown",
							});
						} catch (error) {
							console.error(error);
							return false;
						}
						return true;
					},
				},
			}),
		];
	},
});
