import { FileHandler } from "@tiptap-pro/extension-file-handler";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import { CustomDataAttribute } from "./customDataAttribute";
import { handleFileUpload } from "./useFileUpload";
export function configureEditor(initialContent: string) {
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
				placeholder: "Write to the world...",
			}),
			Image,
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
			CustomDataAttribute,
		],
		content: initialContent,
		editorProps: {
			attributes: {
				class: "focus:outline-none",
			},
		},
	};
}
