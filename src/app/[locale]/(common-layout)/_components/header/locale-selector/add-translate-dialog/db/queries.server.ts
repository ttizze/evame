import { db } from "@/db/kysely";

/** ページに紐づくコメントのID一覧を取得 */
export async function fetchPageCommentIds(pageId: number): Promise<number[]> {
	const comments = await db
		.selectFrom("pageComments")
		.select(["id"])
		.where("pageId", "=", pageId)
		.execute();
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
	const links = await db
		.selectFrom("segmentAnnotationLinks")
		.innerJoin(
			"segments as mainSegment",
			"mainSegment.id",
			"segmentAnnotationLinks.mainSegmentId",
		)
		.innerJoin(
			"segments as annotationSegment",
			"annotationSegment.id",
			"segmentAnnotationLinks.annotationSegmentId",
		)
		.select(["annotationSegment.contentId"])
		.where("mainSegment.contentId", "=", pageId)
		.where("annotationSegment.contentId", "!=", pageId)
		.execute();

	// 重複を除去してコンテンツID一覧を返す
	const contentIds = new Set<number>();
	for (const link of links) {
		if (link.contentId) {
			contentIds.add(link.contentId);
		}
	}
	return Array.from(contentIds);
}
