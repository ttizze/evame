import type { Editor as TiptapEditor } from "@tiptap/core";
import { nanoid } from "nanoid";
import { uploadImage } from "@/app/[locale]/_lib/upload";
export async function handleFileUpload(
	file: File,
	editor: TiptapEditor,
	pos?: number,
) {
	const insertPos = pos ?? editor.state.selection.anchor;
	const placeholderSrc = "/loading.gif";
	const placeholderId = `uploading-${nanoid()}`;

	editor
		.chain()
		.insertContentAt(insertPos, {
			type: "image",
			attrs: { src: placeholderSrc, "data-uploading-id": placeholderId },
		})
		.run();

	const [dimensions, uploadResult] = await Promise.all([
		getImageDimensions(file),
		uploadImage(file),
	]);
	if (!uploadResult.success) {
		window.alert(uploadResult.message);
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
				src: uploadResult.data?.imageUrl,
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
		if (!file.type.startsWith("image/")) {
			reject(new Error("無効なファイルタイプです。画像のみ許可されています。"));
			return;
		}

		const blobUrl = URL.createObjectURL(file);
		const img = new Image();

		img.onload = () => {
			const dimensions = {
				width: img.naturalWidth,
				height: img.naturalHeight,
			};

			URL.revokeObjectURL(blobUrl);
			resolve(dimensions);
		};

		img.onerror = (err) => {
			URL.revokeObjectURL(blobUrl);
			reject(err);
		};

		img.crossOrigin = "anonymous";

		img.src = blobUrl;
	});
}
