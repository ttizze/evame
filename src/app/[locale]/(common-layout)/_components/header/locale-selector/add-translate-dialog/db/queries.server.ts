import { db } from "@/db";

/**
 * ページに紐づくコメントのID一覧を取得
 * Kysely版に移行済み
 */
export async function fetchPageCommentIds(pageId: number): Promise<number[]> {
	const comments = await db
		.selectFrom("pageComments")
		.select("id")
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
 *
 * Kysely版に移行済み
 */
export async function fetchAnnotationContentIdsForPage(
	pageId: number,
): Promise<number[]> {
	const result = await db
		.selectFrom("segmentAnnotationLinks")
		.innerJoin(
			"segments as mainSegment",
			"segmentAnnotationLinks.mainSegmentId",
			"mainSegment.id",
		)
		.innerJoin(
			"segments as annotationSegment",
			"segmentAnnotationLinks.annotationSegmentId",
			"annotationSegment.id",
		)
		.select("annotationSegment.contentId")
		.distinct()
		.where("mainSegment.contentId", "=", pageId)
		.where("annotationSegment.contentId", "!=", pageId)
		.execute();

	return result.map((row) => row.contentId);
}
