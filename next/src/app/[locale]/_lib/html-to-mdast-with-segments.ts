import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeSanitize from "rehype-sanitize";
/* html-to-mdast-with-segments.ts ----------------------------------------- */
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";

import { remarkHashAndSegments } from "@/app/[locale]/_lib/remark-hash-and-segments";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { uploadImage } from "@/app/[locale]/_lib/upload";
import type { Prisma } from "@prisma/client";
import type { Root as MdastRoot } from "mdast";
import sharp from "sharp";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { VFile } from "vfile";
interface Params {
	header?: string;
	html: string;
}

interface Result {
	mdastJson: Prisma.InputJsonValue; // DB 書き込み用
	segments: SegmentDraft[];
	file: VFile; // ログや警告を見たい時用
}

export async function htmlToMdastWithSegments({
	header,
	html,
}: Params): Promise<Result> {
	/* 1. パーサ + 変換プラグインだけを組む ----------------------------- */
	const processor = unified()
		.use(rehypeParse, { fragment: true }) // HTML → HAST
		.use(rehypeSanitize) // XSS 対策
		.use(rehypeRemark) // HAST → MDAST
		.use(remarkHashAndSegments(header)) // ハッシュ抽出
		.use(remarkAutoUploadImages); // 画像自動アップロード

	/* 2. VFile を自前で作り ↓ parse → run ----------------------------- */
	const file = new VFile({ value: html });
	let tree = processor.parse(file); // HAST
	tree = await processor.run(tree, file); // MDAST + segments

	const mdast = tree as MdastRoot;

	/* 3. position を削ぎ落として軽量化 ------------------------------- */
	removePosition(mdast, { force: true });

	return {
		mdastJson: mdast as unknown as Prisma.InputJsonValue,
		segments: (file.data as { segments: SegmentDraft[] }).segments,
		file,
	};
}

export async function fileFromUrl(url: string): Promise<File> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`fetch failed: ${url}`);
	const blob = await res.blob();
	const ext = url.split(".").pop()?.split("?")[0] ?? "png";
	return new File([blob], `remote.${ext}`, {
		type: blob.type || `image/${ext}`,
	});
}
// S3 / R2 など

export const remarkAutoUploadImages: Plugin<[]> = () => {
	return async (tree: MdastRoot) => {
		// ここに来た時点で必ず MDAST
		const tasks: Promise<void>[] = [];

		visit(tree, "image", (node) => {
			if (!node.url.includes("evame/uploads")) return;
			tasks.push(
				(async () => {
					const file = await fileFromUrl(node.url);

					// 例：サーバで再エンコードして 2 MB 以下に
					const buf = await sharp(await file.arrayBuffer())
						.resize({ width: 2560, withoutEnlargement: true })
						.jpeg({ quality: 80, mozjpeg: true })
						.toBuffer();

					const compact = new File([buf], file.name, { type: "image/jpeg" });

					const result = await uploadImage(compact);
					if (result.success) {
						node.url = result.data.imageUrl;
					} else {
						console.error(result.message);
					}
				})(),
			);
		});

		await Promise.all(tasks);
	};
};
