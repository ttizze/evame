import type { PageCommentWithSegments } from "../_db/queries.server";

/** 平坦なコメント一覧を親子ツリーへ変換する。 */
export function buildCommentTree(
	flatComments: PageCommentWithSegments[],
): PageCommentWithSegments[] {
	const commentMap = new Map<number, PageCommentWithSegments>();
	for (const comment of flatComments) {
		commentMap.set(comment.id, { ...comment, replies: [] });
	}

	const tree: PageCommentWithSegments[] = [];
	for (const comment of commentMap.values()) {
		if (comment.parentId === null) {
			tree.push(comment);
			continue;
		}

		const parent = commentMap.get(comment.parentId);
		if (parent) parent.replies?.push(comment);
	}

	return tree;
}
