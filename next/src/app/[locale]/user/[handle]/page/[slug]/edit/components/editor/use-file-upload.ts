import { uploadImage } from "@/app/[locale]/lib/upload";
import type { Editor as TiptapEditor } from "@tiptap/core";

export async function handleFileUpload(
	file: File,
	editor: TiptapEditor,
	pos?: number,
) {
	const insertPos = pos ?? editor.state.selection.anchor;
	const placeholderSrc = "/uploading.png";
	editor
		.chain()
		.insertContentAt(insertPos, {
			type: "image",
			attrs: { src: placeholderSrc },
		})
		.run();

	const dimensions = await getImageDimensions(file);

	const url = await uploadImage(file);
	if (!url.success) {
		window.alert(url.message);
		return;
	}
	editor
		.chain()
		.updateAttributes("image", {
			src: url.data?.imageUrl,
			width: dimensions.width,
			height: dimensions.height,
		})
		.createParagraphNear()
		.focus()
		.run();
}

async function getImageDimensions(
	file: File,
): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const blobUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
			URL.revokeObjectURL(blobUrl);
		};
		img.onerror = (err) => {
			URL.revokeObjectURL(blobUrl);
			reject(err);
		};
		img.src = blobUrl;
	});
}
