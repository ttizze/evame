import type { Root as MdastRoot } from "mdast";
import pLimit from "p-limit";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { uploadImage } from "../_service/upload/upload-image";
import { fileFromUrl } from "../_utils/file-from-url";

const limit = pLimit(5);

export const remarkAutoUploadImages: Plugin<[]> = () => {
	return async (tree: MdastRoot) => {
		// ここに来た時点で必ず MDAST
		const tasks: Promise<void>[] = [];

		visit(tree, "image", (node) => {
			// Skip images that are already hosted on our storage, or are local/placeholder URLs
			if (
				node.url.includes("evame/uploads") ||
				node.url.startsWith("/") ||
				node.url.startsWith("data:") ||
				node.url.startsWith("blob:")
			) {
				return;
			}
			tasks.push(
				limit(async () => {
					const file = await fileFromUrl(node.url);
					const result = await uploadImage(file);
					if (result.success) {
						node.url = result.data.imageUrl;
					} else {
						console.error(result.message);
					}
				}),
			);
		});

		await Promise.all(tasks);
	};
};
