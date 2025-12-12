import { and, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/drizzle";
import {
	pageComments,
	segmentAnnotationLinks,
	segments,
} from "@/drizzle/schema";

/**
 * ページに紐づくコメントのID一覧を取得
 * Drizzle版に移行済み
 */
export async function fetchPageCommentIds(pageId: number): Promise<number[]> {
	const comments = await db
		.select({ id: pageComments.id })
		.from(pageComments)
		.where(eq(pageComments.pageId, pageId));

	return comments.map((c) => c.id);
}

// 同じsegmentsテーブルを2回JOINするためのエイリアス
const mainSegment = alias(segments, "main_segment");
const annotationSegment = alias(segments, "annotation_segment");

/**
 * 本文にリンクされた注釈のうち、別コンテンツに属するもののコンテンツID一覧を取得
 *
 * - Page と Content は 1:1 で ID が同じなので、mainSegment.contentId = pageId で本文を特定
 * - 本文と同じ contentId の注釈は本文ジョブで翻訳されるため除外し、別コンテンツのみ返す
 * - 注釈が別コンテンツになるケース: ティピタカ系では注釈自体が単体で読まれる構造がある
 *
 * Drizzle版に移行済み
 */
export async function fetchAnnotationContentIdsForPage(
	pageId: number,
): Promise<number[]> {
	const result = await db
		.selectDistinct({
			contentId: annotationSegment.contentId,
		})
		.from(segmentAnnotationLinks)
		.innerJoin(
			mainSegment,
			eq(segmentAnnotationLinks.mainSegmentId, mainSegment.id),
		)
		.innerJoin(
			annotationSegment,
			eq(segmentAnnotationLinks.annotationSegmentId, annotationSegment.id),
		)
		.where(
			and(
				eq(mainSegment.contentId, pageId),
				ne(annotationSegment.contentId, pageId),
			),
		);

	return result.map((row) => row.contentId);
}
