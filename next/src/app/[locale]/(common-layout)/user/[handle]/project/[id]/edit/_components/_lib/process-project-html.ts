import { collectBlocksFromRoot } from "@/app/[locale]/_lib/process-html";
import { injectSpanNodes } from "@/app/[locale]/_lib/process-html";
import type { Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import rehypeUnwrapImages from "rehype-unwrap-images";
import { unified } from "unified";
import type { Plugin } from "unified";
import {
	syncProjectSegments,
	updateProjectWithHtml,
} from "../../_db/mutations.server";

//テキストが編集された場合､元テキストとの紐づけを更新する
//紐づけはtextAndOccurrenceHashをキーにして行う
//textAndOccurrenceHashはテキストのハッシュ値と出現回数を組み合わせたもの
//表示にはtextAndOccurrenceHashをキーにすると時間がかかるので､data-number-idをキーにする
export function rehypeAddDataId(
	projectId: string,
	tagLine: string,
): Plugin<[], Root> {
	return function attacher() {
		return async (tree: Root) => {
			const blocks = collectBlocksFromRoot(tree, tagLine);
			await syncProjectSegments(projectId, blocks);
			injectSpanNodes(blocks);
		};
	};
}

// 例） HTML → HAST → MDAST → remark → HAST → HTML の流れで使う想定
export async function processProjectHtml(
	projectId: string,
	tagLine: string,
	description: string,
	userId: string,
) {
	const file = await unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeAddDataId(projectId, tagLine))
		.use(rehypeRaw)
		.use(rehypeUnwrapImages)
		.use(rehypeStringify, { allowDangerousHtml: true }) // HAST→HTML
		.process(description);

	const htmlContent = String(file);
	const updatedProject = await updateProjectWithHtml(
		projectId,
		htmlContent,
		userId,
	);
	return updatedProject;
}
