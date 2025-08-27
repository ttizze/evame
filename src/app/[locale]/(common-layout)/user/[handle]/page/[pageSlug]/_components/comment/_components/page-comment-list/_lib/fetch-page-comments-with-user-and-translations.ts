import {
	fetchPageCommentsWithSegments,
	type PageCommentWithSegments,
} from "../_db/queries.server";

export async function buildCommentTree(
	flatComments: PageCommentWithSegments[],
): Promise<PageCommentWithSegments[]> {
	// 各コメントに空のrepliesプロパティを付与
	const commentMap = new Map<number, PageCommentWithSegments>(
		flatComments.map((comment) => [comment.id, { ...comment, replies: [] }]),
	);

	const tree: PageCommentWithSegments[] = [];
	for (const comment of commentMap.values()) {
		if (comment.parentId) {
			const parent = commentMap.get(comment.parentId);
			if (parent) {
				parent.replies?.push(comment);
			}
		} else {
			tree.push(comment);
		}
	}
	return tree;
}

async function mapComment(
	comment: PageCommentWithSegments,
): Promise<PageCommentWithSegments> {
	return {
		...comment,
		replies: await Promise.all((comment.replies ?? []).map(mapComment)),
	};
}

// メインの関数
export async function fetchPageCommentsWithUserAndTranslations(
	pageId: number,
	locale: string,
) {
	// 1. Prismaからflatなコメントを取得
	const flatComments = await fetchPageCommentsWithSegments(pageId, locale);

	// 2. flatなコメントからツリーを構築
	const tree = await buildCommentTree(flatComments);

	// 3. ツリー構造の各コメントに対して翻訳情報をマッピング
	return await Promise.all(tree.map((comment) => mapComment(comment)));
}

export type PageCommentWithUserAndTranslations = Awaited<
	ReturnType<typeof fetchPageCommentsWithUserAndTranslations>
>;
