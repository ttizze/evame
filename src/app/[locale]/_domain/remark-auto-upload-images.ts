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
		const internalImageHosts = new Set<string>(
			[
				"images.evame.tech",
				"images.eveeve.org",
				process.env.NEXT_PUBLIC_CF_IMAGE_HOST?.trim(),
			].filter(
				(host): host is string => typeof host === "string" && host !== "",
			),
		);

		visit(tree, "image", (node) => {
			// 既に自前ホストの画像、またはローカル/プレースホルダはアップロードしない。
			// (push/pullで差分が出ないことが最重要)
			const url = node.url;
			if (
				url.startsWith("/") ||
				url.startsWith("data:") ||
				url.startsWith("blob:")
			) {
				return;
			}
			if (url.includes("evame/uploads") || url.includes("eveeve/uploads")) {
				return;
			}
			try {
				const parsed = new URL(url);
				if (
					(parsed.hostname === "localhost" ||
						parsed.hostname === "127.0.0.1") &&
					parsed.pathname.includes("/uploads/")
				) {
					return;
				}
				if (
					internalImageHosts.has(parsed.hostname) &&
					parsed.pathname.startsWith("/uploads/")
				) {
					return;
				}
			} catch {
				// 相対パス等は fetch できないので、そのまま残す。
				return;
			}
			tasks.push(
				limit(async () => {
					const file = await fileFromUrl(url);
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
