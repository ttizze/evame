import { prisma } from "@/lib/prisma";

/** ページに紐づくコメントのID一覧を取得 */
export async function fetchPageCommentIds(pageId: number): Promise<number[]> {
	const comments = await prisma.pageComment.findMany({
		where: { pageId },
		select: { id: true },
	});
	return comments.map((c) => c.id);
}

/**
 * 本文にリンクされた注釈のうち、別コンテンツに属するもののコンテンツID一覧を取得
 *
 * - Page と Content は 1:1 で ID が同じなので、mainSegment.contentId = pageId で本文を特定
 * - 本文と同じ contentId の注釈は本文ジョブで翻訳されるため除外し、別コンテンツのみ返す
 * - 注釈が別コンテンツになるケース: ティピタカ系では注釈自体が単体で読まれる構造がある
 */
export async function fetchAnnotationContentIdsForPage(
	pageId: number,
): Promise<number[]> {
	const links = await prisma.segmentAnnotationLink.findMany({
		where: {
			mainSegment: { contentId: pageId },
			annotationSegment: { contentId: { not: pageId } },
		},
		select: {
			annotationSegment: { select: { contentId: true } },
		},
	});

	// 重複を除去してコンテンツID一覧を返す
	const contentIds = new Set<number>();
	for (const { annotationSegment } of links) {
		if (annotationSegment) {
			contentIds.add(annotationSegment.contentId);
		}
	}
	return Array.from(contentIds);
}
