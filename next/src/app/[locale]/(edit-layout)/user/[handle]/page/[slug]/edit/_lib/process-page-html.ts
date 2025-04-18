import { collectBlocksFromRoot } from "@/app/[locale]/_lib/process-html";
import { injectSpanNodes } from "@/app/[locale]/_lib/process-html";
import type { Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import rehypeUnwrapImages from "rehype-unwrap-images";
import { unified } from "unified";
import type { Plugin } from "unified";
import { syncPageSegments, upsertPageWithHtml } from "../_db/mutations.server";

//テキストが編集された場合､元テキストとの紐づけを更新する
//紐づけはtextAndOccurrenceHashをキーにして行う
//textAndOccurrenceHashはテキストのハッシュ値と出現回数を組み合わせたもの
//表示にはtextAndOccurrenceHashをキーにすると時間がかかるので､data-number-idをキーにする
export function rehypeAddDataId(
	pageId: number,
	title: string,
): Plugin<[], Root> {
	return function attacher() {
		return async (tree: Root) => {
			const blocks = collectBlocksFromRoot(tree, title);
			await syncPageSegments(pageId, blocks);
			injectSpanNodes(blocks);
		};
	};
}

// 例） HTML → HAST → MDAST → remark → HAST → HTML の流れで使う想定
export async function processPageHtml(
	title: string,
	html: string,
	pageSlug: string,
	userId: string,
	sourceLocale: string,
) {
	// HTML 入力に対応する page レコードを作成/更新
	const page = await upsertPageWithHtml(pageSlug, html, userId, sourceLocale);

	const file = await unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeAddDataId(page.id, title))
		.use(rehypeRaw)
		.use(rehypeUnwrapImages)
		.use(rehypeStringify, { allowDangerousHtml: true }) // HAST→HTML
		.process(html);

	const htmlContent = String(file);
	const updatedPage = await upsertPageWithHtml(
		pageSlug,
		htmlContent,
		userId,
		sourceLocale,
	);
	return updatedPage;
}
