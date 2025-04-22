import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import type { SegmentBundle } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import {
	type PageCommentWithPageCommentSegments,
	fetchPageCommentsWithPageCommentSegments,
} from "../_db/queries.server";

export function normalizeCommentSegments(
	segments: {
		id: number;
		number: number;
		text: string;
		textAndOccurrenceHash: string;
		pageCommentSegmentTranslations: {
			id: number;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
			user: SanitizedUser;
			pageCommentSegmentTranslationVotes?: {
				isUpvote: boolean;
				updatedAt: Date;
			}[];
		}[];
	}[],
) {
	return segments.map((seg) => ({
		id: seg.id,
		number: seg.number,
		text: seg.text,
		textAndOccurrenceHash: seg.textAndOccurrenceHash,
		segmentTranslations: seg.pageCommentSegmentTranslations.map((t) => ({
			...t,
			currentUserVote: t.pageCommentSegmentTranslationVotes?.[0] ?? null,
		})),
	}));
}

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
	segmentBundles: SegmentBundle[];
	replies: ExtendedComment[];
}
export async function mapComment(
	comment: PageCommentWithPageCommentSegments,
): Promise<ExtendedComment> {
	const segmentBundles = toSegmentBundles(
		"comment",
		comment.id,
		normalizeCommentSegments(comment.pageCommentSegments),
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
	return await Promise.all(tree.map((comment) => mapComment(comment)));
}

export type PageCommentWithUserAndTranslations = Awaited<
	ReturnType<typeof fetchPageCommentsWithUserAndTranslations>
>;
