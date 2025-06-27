import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import { FileHandler } from "@tiptap-pro/extension-file-handler";
import { Markdown } from "tiptap-markdown";
import { CustomImage } from "./custom-image";
import { X } from "./extensions/x-embed";
import { handleFileUpload } from "./use-file-upload";

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
				// 「テキスト塊」を <p> で包む
				// まず最初と最後に 1 組の <p> を付ける
				// 「連続 <br> 2 個以上」を </p><p> に置き換える
				// そのあと 必ず ProseMirror に渡す
				// ProseMirror は
				// タグの整合を自動で取り
				// 不要になった最外の <p> は取り除き
				// キャレットを置くために必要なところだけ
				// <br class="ProseMirror-trailingBreak"> を残します。
				return `<p>${html
					// 連続 <br> 2個以上 → 段落区切り
					.replace(/(<br\b[^>]*>\s*){2,}/gi, "</p><p>")
					// 中身が <br> しかない段落は削除
					.replace(/<p[^>]*>(?:\s|&nbsp;|<br\b[^>]*>)*<\/p>/gi, "")}</p>`;
			},
			attributes: {
				class: "focus:outline-hidden",
			},
		},
	};
}
