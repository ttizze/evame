import { createServerLogger } from "@/app/_service/logger.server";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import {
	createAnnotationLinks,
	deleteAnnotationLinksByContentId,
} from "./db/mutations.server";
import {
	fetchLastSegmentBeforeFirstParagraphId,
	fetchPrimarySegmentsWithParagraphNumbers,
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
	annotationSegmentsBeforeFirstParagraph: Array<number> | null = null,
): Promise<void> {
	const logger = createServerLogger("sync-annotation-links", {
		contentId,
		anchorContentId,
		paragraphCount: paragraphNumberToAnnotationSegmentIds.size,
	});

	if (!anchorContentId) {
		return;
	}

	// 既存のアノテーションリンクを全削除（このコンテンツ配下）
	await deleteAnnotationLinksByContentId(tx, contentId);

	const prefaceLinks = await buildPrefaceLinks(
		tx,
		anchorContentId,
		annotationSegmentsBeforeFirstParagraph,
	);

	if (paragraphNumberToAnnotationSegmentIds.size === 0) {
		if (prefaceLinks.length > 0) {
			await createAnnotationLinks(tx, prefaceLinks);
		}
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

	// domainロジック: リンク作成データを構築
	const { linksToCreate, failedLinks } = buildLinksToCreate(
		paragraphNumberToPrimarySegmentId,
		paragraphNumberToAnnotationSegmentIds,
	);
	const allLinksToCreate =
		prefaceLinks.length > 0
			? [...linksToCreate, ...prefaceLinks]
			: linksToCreate;

	// アノテーションリンクを作成
	if (allLinksToCreate.length > 0) {
		await createAnnotationLinks(tx, allLinksToCreate);
	} else {
		const annotationSegmentIds = Array.from(
			paragraphNumberToAnnotationSegmentIds.values(),
		).flat();
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
				prefaceLinkCount: prefaceLinks.length,
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

async function buildPrefaceLinks(
	tx: TransactionClient,
	anchorContentId: number,
	annotationSegmentsBeforeFirstParagraph: Array<number> | null,
): Promise<Array<{ mainSegmentId: number; annotationSegmentId: number }>> {
	if (!annotationSegmentsBeforeFirstParagraph) {
		return [];
	}

	const matchedMainSegmentId = await fetchLastSegmentBeforeFirstParagraphId(
		tx,
		anchorContentId,
	);

	if (!matchedMainSegmentId) {
		return [];
	}

	return annotationSegmentsBeforeFirstParagraph.map((annotationSegmentId) => ({
		mainSegmentId: matchedMainSegmentId,
		annotationSegmentId,
	}));
}
