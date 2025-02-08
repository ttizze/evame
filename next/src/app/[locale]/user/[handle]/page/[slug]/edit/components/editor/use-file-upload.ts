import { uploadImage } from "@/app/[locale]/lib/upload";
import type { Editor as TiptapEditor } from "@tiptap/core";

export async function handleFileUpload(
	file: File,
	editor: TiptapEditor,
	pos?: number,
) {
	const insertPos = pos ?? editor.state.selection.anchor;
	const placeholderSrc =
		"https://via.placeholder.com/300x200?text=Uploading...";

	editor
		.chain()
		.insertContentAt(insertPos, {
			type: "image",
			attrs: { src: placeholderSrc },
		})
		.run();

	try {
		const url = await uploadImage(file);
		editor
			.chain()
			.updateAttributes("image", { src: url })
			.createParagraphNear()
			.focus()
			.run();
	} catch (error) {
		console.error(error);
		window.alert("upload error");
	}
}
