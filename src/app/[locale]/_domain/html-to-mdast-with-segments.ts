import type { Root as MdastRoot } from "mdast";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";
import { removePosition } from "unist-util-remove-position";
import { VFile } from "vfile";
/* html-to-mdast-with-segments.ts ----------------------------------------- */
import { remarkAutoUploadImages } from "@/app/[locale]/_domain/remark-auto-upload-images";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { remarkHashAndSegments } from "@/app/[locale]/_domain/remark-hash-and-segments";

interface Params {
	header?: string;
	html: string;
}

interface Result {
	mdastJson: MdastRoot; // DB 書き込み用
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
		mdastJson: mdast,
		segments: (file.data as { segments: SegmentDraft[] }).segments,
		file,
	};
}
