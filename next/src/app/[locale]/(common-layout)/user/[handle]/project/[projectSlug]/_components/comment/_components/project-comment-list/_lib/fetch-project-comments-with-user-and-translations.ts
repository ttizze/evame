import { toSegmentBundles } from "@/app/[locale]/_lib/to-segment-bundles";
import type { SegmentBundle } from "@/app/[locale]/types";
import type { SanitizedUser } from "@/app/types";
import {
	type ProjectCommentWithProjectCommentSegments,
	fetchProjectCommentsWithProjectCommentSegments,
} from "../_db/queries.server";

function normalizeProjectCommentSegments(
	segments: {
		id: number;
		number: number;
		text: string;
		projectCommentSegmentTranslations: {
			id: number;
			locale: string;
			text: string;
			point: number;
			createdAt: Date;
			user: SanitizedUser;
			projectCommentSegmentTranslationVotes?: {
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
		segmentTranslations: seg.projectCommentSegmentTranslations.map((t) => ({
			...t,
			currentUserVote: t.projectCommentSegmentTranslationVotes?.[0] ?? null,
		})),
	}));
}

async function buildProjectCommentTree(
	flatComments: ProjectCommentWithProjectCommentSegments[],
): Promise<ProjectCommentWithProjectCommentSegments[]> {
	// 各コメントに空のrepliesプロパティを付与
	const commentMap = new Map<number, ProjectCommentWithProjectCommentSegments>(
		flatComments.map((comment) => [comment.id, { ...comment, replies: [] }]),
	);

	const tree: ProjectCommentWithProjectCommentSegments[] = [];
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
	extends Omit<ProjectCommentWithProjectCommentSegments, "replies"> {
	segmentBundles: SegmentBundle[];
	replies: ExtendedComment[];
}
async function mapComment(
	comment: ProjectCommentWithProjectCommentSegments,
): Promise<ExtendedComment> {
	const segmentBundles = toSegmentBundles(
		"projectComment",
		comment.id,
		normalizeProjectCommentSegments(comment.projectCommentSegments),
	);

	return {
		...comment,
		segmentBundles,
		replies: await Promise.all((comment.replies ?? []).map(mapComment)),
	};
}

// メインの関数
export async function fetchProjectCommentsWithUserAndTranslations(
	projectId: number,
	locale: string,
	currentUserId?: string,
) {
	// 1. Prismaからflatなコメントを取得
	const flatComments = await fetchProjectCommentsWithProjectCommentSegments(
		projectId,
		locale,
		currentUserId,
	);

	// 2. flatなコメントからツリーを構築
	const tree = await buildProjectCommentTree(flatComments);

	// 3. ツリー構造の各コメントに対して翻訳情報をマッピング
	return await Promise.all(tree.map((comment) => mapComment(comment)));
}

export type ProjectCommentWithUserAndTranslations = Awaited<
	ReturnType<typeof fetchProjectCommentsWithUserAndTranslations>
>;
