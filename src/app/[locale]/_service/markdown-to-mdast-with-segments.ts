import remarkParse from "remark-parse";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { VFile } from "vfile";
import type { JsonValue } from "@/db/types";
import type { SegmentDraft } from "../_domain/remark-hash-and-segments";
import { remarkHashAndSegments } from "../_domain/remark-hash-and-segments";
import { remarkAutoUploadImages } from "./remark-auto-upload-images";

/**
 * Markdown 文字列を MDAST(JSON) + SegmentDraft[] に変換するヘルパー。
 *   – header を渡すと SegmentDraft の number=0 相当としてハッシュ化に利用できる。
 */
export async function markdownToMdastWithSegments({
	header,
	markdown,
	autoUploadImages,
}: {
	header: string;
	markdown: string;
	autoUploadImages: boolean;
}) {
	const processor = unified()
		.use(remarkParse) // Markdown → MDAST
		.use(remarkHashAndSegments(header)); // ハッシュ + Segment 生成

	if (autoUploadImages) {
		processor.use(remarkAutoUploadImages); // 画像の自動アップロード
	}

	const file = new VFile({ value: markdown });
	let tree = processor.parse(file); // MDAST
	tree = await processor.run(tree, file); // MDAST + segments

	// 余計な position を削除して軽量化
	removePosition(tree, { force: true });

	return {
		mdastJson: tree as JsonValue,
		segments: (file.data as { segments: SegmentDraft[] }).segments,
		file,
	};
}
