import { getBestTranslation } from "@/app/[locale]/_lib/get-best-translation";
import type { SegmentTranslationWithVote } from "@/app/[locale]/types";
import {
	type PageCommentWithPageCommentSegments,
	fetchPageCommentsWithPageCommentSegments,
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

export interface ExtendedComment
	extends Omit<PageCommentWithPageCommentSegments, "replies"> {
	pageCommentSegmentsWithTranslations: {
		// 必要な型定義
		segment: PageCommentWithPageCommentSegments["pageCommentSegments"][number];
		segmentTranslationsWithVotes: SegmentTranslationWithVote[];
		bestSegmentTranslationWithVote: SegmentTranslationWithVote | null;
	}[];
	replies: ExtendedComment[];
}

export async function mapCommentTranslations(
	comment: PageCommentWithPageCommentSegments,
	locale: string,
): Promise<ExtendedComment> {
	const pageCommentSegmentsWithTranslations = await Promise.all(
		comment.pageCommentSegments.map(async (segment) => {
			const segmentTranslationsWithVotes: SegmentTranslationWithVote[] =
				segment.pageCommentSegmentTranslations.map((translation) => ({
					segmentTranslation: {
						...translation,
						user: translation.user,
					},
					translationVote:
						translation.pageCommentSegmentTranslationVotes &&
						translation.pageCommentSegmentTranslationVotes.length > 0
							? {
									...translation.pageCommentSegmentTranslationVotes[0],
									translationId: translation.id,
								}
							: null,
				}));
			const bestSegmentTranslationWithVote = await getBestTranslation(
				segmentTranslationsWithVotes,
			);
			return {
				segment,
				segmentTranslationsWithVotes,
				bestSegmentTranslationWithVote,
			};
		}),
	);

	return {
		...comment,
		pageCommentSegmentsWithTranslations,
		replies: await Promise.all(
			(comment.replies || []).map((child) =>
				mapCommentTranslations(child, locale),
			),
		),
	};
}

// メインの関数
export async function fetchPageCommentsWithUserAndTranslations(
	pageId: number,
	locale: string,
	currentUserId?: string,
) {
	// 1. Prismaからflatなコメントを取得
	const flatComments = await fetchPageCommentsWithPageCommentSegments(
		pageId,
		locale,
		currentUserId,
	);

	// 2. flatなコメントからツリーを構築
	const tree = await buildCommentTree(flatComments);

	// 3. ツリー構造の各コメントに対して翻訳情報をマッピング
	return await Promise.all(
		tree.map((comment) => mapCommentTranslations(comment, locale)),
	);
}

export type PageCommentWithUserAndTranslations = Awaited<
	ReturnType<typeof fetchPageCommentsWithUserAndTranslations>
>;
