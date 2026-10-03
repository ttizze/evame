import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { nanoid } from "nanoid";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { uploadImage } from "@/app/[locale]/_service/upload/upload-image";
import type { ActionResponse } from "@/app/types";

export type EditorImageUploadResult = ActionResponse<{ imageUrl: string }>;
export type EditorImageUpload = (options: {
	data: FormData;
}) => Promise<EditorImageUploadResult>;

const formDataValidator = (value: unknown) => {
	if (!(value instanceof FormData)) {
		throw new Error("Expected FormData");
	}
	return value;
};

export const uploadEditorImage = createServerFn({ method: "POST" })
	.validator(formDataValidator)
	.handler(async ({ data: formData }): Promise<EditorImageUploadResult> => {
		const currentUser = await getCurrentUserFromHeaders(
			new Headers(getRequestHeaders()),
		);
		if (!currentUser?.id) {
			throw redirect({ href: "/auth/login" });
		}

		const file = formData.get("image");
		if (!(file instanceof File)) {
			return { success: false, message: "Please select a valid image file" };
		}
		return uploadImage(file);
	});

export async function handleFileUpload(
	file: File,
	editor: TiptapEditor,
	uploadImageFn: EditorImageUpload,
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

	const formData = new FormData();
	formData.set("image", file);
	const [dimensions, uploadResult] = await Promise.all([
		getImageDimensions(file),
		uploadImageFn({ data: formData }),
	]);
	if (!uploadResult.success) {
		window.alert(uploadResult.message);
		return;
	}

	let posToUpdate: number | null = null;
	editor.state.doc.descendants((node, nodePos) => {
		if (
			node.type.name === "image" &&
			node.attrs["data-uploading-id"] === placeholderId
		) {
			posToUpdate = nodePos;
			return false;
		}
		return true;
	});
	if (posToUpdate !== null) {
		editor
			.chain()
			.setNodeSelection(posToUpdate)
			.updateAttributes("image", {
				src: uploadResult.data?.imageUrl,
				width: dimensions.width,
				height: dimensions.height,
				"data-uploading-id": null,
			})
			.createParagraphNear()
			.focus()
			.run();
	} else {
		console.error("アップロード用プレースホルダー画像が見つかりませんでした");
	}
}

function getImageDimensions(
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
			const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
			URL.revokeObjectURL(blobUrl);
			resolve(dimensions);
		};
		img.onerror = (error) => {
			URL.revokeObjectURL(blobUrl);
			reject(error);
		};
		img.crossOrigin = "anonymous";
		img.src = blobUrl;
	});
}
