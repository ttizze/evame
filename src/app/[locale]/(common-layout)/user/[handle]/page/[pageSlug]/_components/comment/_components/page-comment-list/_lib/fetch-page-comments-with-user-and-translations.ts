import { toBaseSegmentBundles } from "@/app/[locale]/_lib/to-base-segment-bundles";
import { toBaseSegmentWithTranslations } from "@/app/[locale]/_lib/to-base-segment-with-translations";
import type { BaseSegmentBundle } from "@/app/[locale]/types";
import {
	fetchPageCommentsWithPageCommentSegments,
	type PageCommentWithPageCommentSegments,
} from "../_db/queries.server";

export async function buildCommentTree(
	flatComments: PageCommentWithPageCommentSegments[],
): Promise<PageCommentWithPageCommentSegments[]> {
	// 各コメントに空のrepliesプロパティを付与
	const commentMap = new Map<number, PageCommentWithPageCommentSegments>(
		flatComments.map((comment) => [comment.id, { ...comment, replies: [] }]),
	);

	const tree: PageCommentWithPageCommentSegments[] = [];
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

interface ExtendedComment
	extends Omit<PageCommentWithPageCommentSegments, "replies"> {
	segmentBundles: BaseSegmentBundle[];
	replies: ExtendedComment[];
}
async function mapComment(
	comment: PageCommentWithPageCommentSegments,
): Promise<ExtendedComment> {
	const segmentBundles = toBaseSegmentBundles(
		"pageComment",
		comment.id,
		toBaseSegmentWithTranslations(
			comment.pageCommentSegments,
			"pageCommentSegmentTranslations",
		),
	);

	return {
		...comment,
		segmentBundles,
		replies: await Promise.all((comment.replies ?? []).map(mapComment)),
	};
}

// メインの関数
export async function fetchPageCommentsWithUserAndTranslations(
	pageId: number,
	locale: string,
) {
	// 1. Prismaからflatなコメントを取得
	const flatComments = await fetchPageCommentsWithPageCommentSegments(
		pageId,
		locale,
	);

	// 2. flatなコメントからツリーを構築
	const tree = await buildCommentTree(flatComments);

	// 3. ツリー構造の各コメントに対して翻訳情報をマッピング
	return await Promise.all(tree.map((comment) => mapComment(comment)));
}

export type PageCommentWithUserAndTranslations = Awaited<
	ReturnType<typeof fetchPageCommentsWithUserAndTranslations>
>;
