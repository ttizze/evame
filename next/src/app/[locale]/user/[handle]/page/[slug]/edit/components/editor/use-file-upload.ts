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

		const url = await uploadImage(file);
		if (!url.success) {
			window.alert(url.error);
			return;
		}
		editor
			.chain()
			.updateAttributes("image", { src: url.imageUrl })
			.createParagraphNear()
			.focus()
			.run();
}
