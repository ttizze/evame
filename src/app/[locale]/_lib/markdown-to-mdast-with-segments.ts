import type { Prisma } from "@prisma/client";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { VFile } from "vfile";
import { remarkAutoUploadImages } from "@/app/[locale]/_lib/remark-auto-upload-images";
import { remarkCustomBlocks } from "@/app/[locale]/_lib/remark-custom-blocks";
import type { SegmentDraft } from "@/app/[locale]/_lib/remark-hash-and-segments";
import { remarkHashAndSegments } from "@/app/[locale]/_lib/remark-hash-and-segments";

interface Params {
	header?: string;
	markdown: string;
}

interface Result {
	mdastJson: Prisma.InputJsonValue;
	segments: SegmentDraft[];
	file: VFile;
}

/**
 * Markdown 文字列を MDAST(JSON) + SegmentDraft[] に変換するヘルパー。
 *   – header を渡すと SegmentDraft の number=0 相当としてハッシュ化に利用できる。
 *   – HTML 版(html-to-mdast-with-segments.ts)と対になる関数。
 */
export async function markdownToMdastWithSegments({
	header,
	markdown,
}: Params): Promise<Result> {
	const processor = unified()
		.use(remarkParse) // Markdown → MDAST
		.use(remarkCustomBlocks) // カスタムブロック記法の解釈
		.use(remarkHashAndSegments(header)) // ハッシュ + Segment 生成
		.use(remarkAutoUploadImages); // 画像の自動アップロード

	const file = new VFile({ value: markdown });
	let tree = processor.parse(file); // MDAST
	tree = await processor.run(tree, file); // MDAST + segments

	// 余計な position を削除して軽量化
	removePosition(tree, { force: true });

	return {
		mdastJson: tree as unknown as Prisma.InputJsonValue,
		segments: (file.data as { segments: SegmentDraft[] }).segments,
		file,
	};
}
