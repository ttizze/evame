import type { PageCommentWithSegments } from "../_db/queries.server";

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
