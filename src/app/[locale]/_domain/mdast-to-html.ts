import type { Json } from "kysely-codegen/dist/db";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

interface Params {
	/** DB に入っている mdastJson (= Prisma.Json) */
	mdastJson: Json;
}

interface Result {
	/** 画面描画・SSR 用にそのまま使える HTML 文字列 */
	html: string;
}

/**
 * mdastJson → (remark→rehype) → HTML へ変換するワンパス関数
 *
 * 逆方向 (htmlToMdastWithSegments) とペアで使う。
 * 「セグメント埋め込み」のロジックは mdast 内に残っている
 * data 属性などをそのまま rehypeStringify が吐き出す形にしておく。
 */
export async function mdastToHtml({ mdastJson }: Params): Promise<Result> {
	if (!mdastJson || Object.keys(mdastJson).length === 0) {
		return { html: "" };
	}

	/* 1. mdastJson は plain object なのでそのまま cast -------------- */
	const mdast = mdastJson;

	const processor = unified()
		.use(remarkRehype, { allowDangerousHtml: true }) // mdast → hast
		.use(rehypeStringify, { allowDangerousHtml: true });

	const hast = await processor.run(mdast); // ✅ parser 不要
	const html = processor.stringify(hast); // stringify だけ実行

	return { html: String(html) };
}
