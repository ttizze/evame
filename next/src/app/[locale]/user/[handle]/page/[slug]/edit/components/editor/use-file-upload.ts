import { uploadImage } from "@/app/[locale]/lib/upload";
import type { Editor as TiptapEditor } from "@tiptap/core";

export async function handleFileUpload(
	file: File,
	editor: TiptapEditor,
	pos?: number,
) {
	const insertPos = pos ?? editor.state.selection.anchor;
	const placeholderSrc = "/uploading.png";
	const placeholderId = `uploading-${Date.now()}`;

	editor
		.chain()
		.insertContentAt(insertPos, {
			type: "image",
			attrs: { src: placeholderSrc, "data-uploading-id": placeholderId },
		})
		.run();

	const dimensions = await getImageDimensions(file);

	const url = await uploadImage(file);
	if (!url.success) {
		window.alert(url.message);
		return;
	}

	let posToUpdate: number | null = null;
	editor.state.doc.descendants((node, pos) => {
		if (
			node.type.name === "image" &&
			node.attrs["data-uploading-id"] === placeholderId
		) {
			posToUpdate = pos;
			return false; // 見つかったので探索終了
		}
	});
	if (posToUpdate !== null) {
		editor
			.chain()
			.setNodeSelection(posToUpdate)
			.updateAttributes("image", {
				src: url.data?.imageUrl,
				width: dimensions.width,
				height: dimensions.height,
				"data-uploading-id": null, // 一意属性は不要なので削除
			})
			.createParagraphNear()
			.focus()
			.run();
	} else {
		console.error("アップロード用プレースホルダー画像が見つかりませんでした");
	}
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
