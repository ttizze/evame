import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { createServerLogger } from "@/lib/logger.server";
import {
	createAnnotationLinks,
	deleteAnnotationLinks,
} from "./db/mutations.server";
import {
	fetchPrimarySegmentsWithParagraphNumbers,
	fetchSegmentTypeKey,
} from "./db/queries.server";
import { buildLinksToCreate } from "./domain/build-links-to-create";
import { buildParagraphMapping } from "./domain/build-paragraph-mapping";

/**
 * 段落番号を使ってアノテーションリンクを作成する
 *
 * 処理の流れ:
 * 1. 現在のコンテンツがCOMMENTARYタイプか確認
 * 2. 親ページのPRIMARYセグメントを取得（テキストから段落番号を抽出）
 * 3. 段落番号でマッチングしてリンクを作成
 */
export async function syncAnnotationLinksByParagraphNumber(
	tx: TransactionClient,
	contentId: number,
	paragraphNumberToAnnotationSegmentIds: Map<string, number[]>,
	anchorContentId: number | null,
): Promise<void> {
	const annotationSegmentIds = Array.from(
		paragraphNumberToAnnotationSegmentIds.values(),
	).flat();

	const logger = createServerLogger("sync-annotation-links", {
		contentId,
		anchorContentId,
		annotationSegmentCount: annotationSegmentIds.length,
		paragraphCount: paragraphNumberToAnnotationSegmentIds.size,
	});

	// 現在のコンテンツのセグメントタイプを確認
	const segmentTypeKey = await fetchSegmentTypeKey(tx, contentId);

	// COMMENTARYタイプでない場合は処理を終了（アノテーションリンクはCOMMENTARYのみ）
	if (segmentTypeKey !== "COMMENTARY") {
		return;
	}

	if (paragraphNumberToAnnotationSegmentIds.size === 0) {
		return;
	}

	if (!anchorContentId) {
		return;
	}

	// 親ページのPRIMARYセグメントを取得（メタデータも取得して段落番号を取得）
	const primarySegments = await fetchPrimarySegmentsWithParagraphNumbers(
		tx,
		anchorContentId,
	);

	// domainロジック: 段落番号 → PRIMARYセグメントIDのマッピングを作成
	const paragraphNumberToPrimarySegmentId =
		buildParagraphMapping(primarySegments);

	// 既存のアノテーションリンクを削除
	await deleteAnnotationLinks(tx, annotationSegmentIds);

	// domainロジック: リンク作成データを構築
	const { linksToCreate, failedLinks } = buildLinksToCreate(
		paragraphNumberToPrimarySegmentId,
		paragraphNumberToAnnotationSegmentIds,
	);

	// アノテーションリンクを作成
	if (linksToCreate.length > 0) {
		await createAnnotationLinks(tx, linksToCreate);
	} else {
		const failedParagraphNumbers = failedLinks.map((f) => f.paragraphNumber);
		const primaryParagraphNumbers = Array.from(
			paragraphNumberToPrimarySegmentId.keys(),
		).sort();
		const annotationParagraphNumbers = Array.from(
			paragraphNumberToAnnotationSegmentIds.keys(),
		).sort();

		logger.warn(
			{
				annotationSegmentCount: annotationSegmentIds.length,
				primarySegmentCount: primarySegments.length,
				failedLinksCount: failedLinks.length,
				primaryParagraphNumberCount: paragraphNumberToPrimarySegmentId.size,
				annotationParagraphNumberCount:
					paragraphNumberToAnnotationSegmentIds.size,
				// サンプル: 失敗した段落番号の最初の20件
				failedParagraphNumberSample: failedParagraphNumbers.slice(0, 20),
				// サンプル: PRIMARYセグメントの段落番号の最初の20件
				primaryParagraphNumberSample: primaryParagraphNumbers.slice(0, 20),
				// サンプル: アノテーションセグメントの段落番号の最初の20件
				annotationParagraphNumberSample: annotationParagraphNumbers.slice(
					0,
					20,
				),
			},
			"No annotation links to create - all links failed",
		);
	}
}
