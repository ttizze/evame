import type { Root as MdastRoot } from "mdast";
import pLimit from "p-limit";
import sharp from "sharp";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { fileFromUrl } from "./file-from-url";
import { uploadImage } from "./upload";
const limit = pLimit(5);

export const remarkAutoUploadImages: Plugin<[]> = () => {
	return async (tree: MdastRoot) => {
		// ここに来た時点で必ず MDAST
		const tasks: Promise<void>[] = [];

		visit(tree, "image", (node) => {
			if (node.url.includes("evame/uploads")) return;
			tasks.push(
				limit(async () => {
					const file = await fileFromUrl(node.url);

					// 例：サーバで再エンコードして 2 MB 以下に
					const buf = await sharp(Buffer.from(await file.arrayBuffer()))
						.resize({ width: 2560, withoutEnlargement: true })
						.jpeg({ quality: 80, mozjpeg: true })
						.toBuffer();

					const jpegName = file.name.replace(/\.[^.]+$/, ".jpg");
					const compact = new File([buf], jpegName, { type: "image/jpeg" });

					const result = await uploadImage(compact);
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
