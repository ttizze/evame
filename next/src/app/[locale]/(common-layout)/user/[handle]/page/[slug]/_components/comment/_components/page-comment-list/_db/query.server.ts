import { getBestTranslation } from "@/app/[locale]/_lib/get-best-translation";
import { prisma } from "@/lib/prisma";
import type { SegmentTranslationWithVote } from "@/app/[locale]/types";

export async function fetchPageCommentsWithUserAndTranslations(
	pageId: number,
	locale: string,
	currentUserId?: string,
) {
	// まず flat なコメントをすべて取得
	const flatComments = await prisma.pageComment.findMany({
		where: { pageId },
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
			pageCommentSegments: {
				include: {
					pageCommentSegmentTranslations: {
						where: { locale },
						include: {
							user: {
								select: {
									id: true,
									name: true,
									handle: true,
									image: true,
									createdAt: true,
									updatedAt: true,
									profile: true,
									twitterHandle: true,
									totalPoints: true,
									isAI: true,
								},
							},
							pageCommentSegmentTranslationVotes: {
								where: currentUserId
									? { userId: currentUserId }
									: { userId: "0" },
							},
						},
						orderBy: [{ point: "desc" }, { createdAt: "desc" }],
					},
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});

	// flatComments の各コメントに、空の replies プロパティを追加してマップを作成
	type CommentWithReplies = (typeof flatComments)[number] & {
		replies: CommentWithReplies[];
	};
	const commentMap = new Map<number, CommentWithReplies>(
		flatComments.map((comment) => [comment.id, { ...comment, replies: [] }]),
	);

	// flat なコメントからツリーを構築（親コメントの下に子コメントを挿入）
	const tree: CommentWithReplies[] = [];
	for (const comment of commentMap.values()) {
		if (comment.parentId) {
			const parent = commentMap.get(comment.parentId);
			if (parent) {
				parent.replies.push(comment);
			}
		} else {
			tree.push(comment);
		}
	}

	// 取得したコメントツリーに対して、ページセグメントの翻訳情報をマッピングする再帰関数
	function mapComment(comment: CommentWithReplies): typeof comment & {
		createdAt: string;
		updatedAt: string;
		pageCommentSegmentsWithTranslations: {
			segment: (typeof comment.pageCommentSegments)[number];
			segmentTranslationsWithVotes: SegmentTranslationWithVote[];
			bestSegmentTranslationWithVote: SegmentTranslationWithVote | null;
		}[];
		replies: ReturnType<typeof mapComment>[];
	} {
		const pageCommentSegmentsWithTranslations = comment.pageCommentSegments.map(
			(segment) => {
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
				const bestSegmentTranslationWithVote = getBestTranslation(
					segmentTranslationsWithVotes,
				);
				return {
					segment,
					segmentTranslationsWithVotes,
					bestSegmentTranslationWithVote,
				};
			},
		);

		return {
			...comment,
			createdAt: comment.createdAt.toLocaleString(locale),
			updatedAt: comment.updatedAt.toLocaleString(locale),
			pageCommentSegmentsWithTranslations,
			replies: comment.replies.map(mapComment),
		};
	}

	// ツリー構造のコメントそれぞれに対してマッピング処理を実施
	return tree.map(mapComment);
}
export type PageCommentWithUser = Awaited<
	ReturnType<typeof fetchPageCommentsWithUserAndTranslations>
>;

export async function getPageCommentById(pageCommentId: number) {
	return await prisma.pageComment.findUnique({
		where: { id: pageCommentId },
	});
}
