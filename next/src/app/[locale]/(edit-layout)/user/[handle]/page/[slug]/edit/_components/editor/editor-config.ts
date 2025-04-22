import { FileHandler } from "@tiptap-pro/extension-file-handler";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { CustomImage } from "./custom-image";
import { X } from "./extensions/x-embed";
import { handleFileUpload } from "./use-file-upload";
export function configureEditor(
	initialContent: JSONContent,
	placeholder: string,
) {
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
			attributes: {
				class: "focus:outline-hidden",
			},
		},
	};
}
