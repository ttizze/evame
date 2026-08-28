import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";
import { syncAnnotationLinksByParagraphNumber } from "../sync-annotation-links-by-paragraph-number";
import { syncSegmentMetadata } from "./db/mutations.server";
import { fetchSegmentTypeKey } from "./db/queries.server";
import { collectAnnotationSegmentsBeforeFirstParagraph } from "./domain/collect-annotation-segments-before-first-paragraph";
import { collectMetadataDrafts } from "./domain/collect-metadata-drafts";
import { groupAnnotationSegmentsByParagraphNumber } from "./domain/group-annotation-segments-by-paragraph-number";

/**
 * SegmentDraft のメタデータを同期し、段落番号を使ってアノテーションリンクを作成する
 *
 * 処理の流れ:
 * 1. domainロジックでメタデータドラフトを収集
 * 2. domainロジックで段落番号ごとにグループ化
 * 3. db操作でメタデータを同期
 * 4. db操作でアノテーションリンクを作成
 */
export async function syncSegmentMetadataAndAnnotationLinks(
	tx: TransactionClient,
	hashToSegmentId: Map<string, number>,
	segments: SegmentDraft[],
	contentId: number,
	anchorContentId: number | null,
): Promise<void> {
	const logger = createServerLogger("sync-segment-metadata-and-links", {
		contentId,
		anchorContentId,
	});

	// 同期対象のセグメントIDのセット
	const segmentIds = new Set(hashToSegmentId.values());

	logger.debug(
		{ segmentCount: segmentIds.size, anchorContentId },
		"Starting metadata and annotation links sync",
	);

	// domainロジック: メタデータドラフトを収集
	const metadataDrafts = collectMetadataDrafts(hashToSegmentId, segments);

	// db操作: メタデータを同期
	await syncSegmentMetadata(tx, segmentIds, metadataDrafts);

	// 現在のコンテンツのセグメントタイプを確認
	const segmentTypeKey = await fetchSegmentTypeKey(tx, contentId);

	// COMMENTARYタイプでない場合もしくはanchorContentIdがない場合は処理を終了（アノテーションリンクはCOMMENTARYのみ）
	if (segmentTypeKey !== "COMMENTARY" || !anchorContentId) {
		return;
	}

	// domainロジック: 段落番号ごとにグループ化
	const paragraphNumberToAnnotationSegmentIds =
		groupAnnotationSegmentsByParagraphNumber(hashToSegmentId, segments);
	const annotationSegmentsBeforeFirstParagraph =
		collectAnnotationSegmentsBeforeFirstParagraph(hashToSegmentId, segments);

	if (
		paragraphNumberToAnnotationSegmentIds.size > 0 ||
		annotationSegmentsBeforeFirstParagraph
	) {
		const annotationSegmentIds = Array.from(
			paragraphNumberToAnnotationSegmentIds.values(),
		).flat();

		logger.debug(
			{
				annotationSegmentCount: annotationSegmentIds.length,
				paragraphCount: paragraphNumberToAnnotationSegmentIds.size,
			},
			"Syncing annotation links",
		);

		await syncAnnotationLinksByParagraphNumber(
			tx,
			contentId,
			paragraphNumberToAnnotationSegmentIds,
			anchorContentId,
			annotationSegmentsBeforeFirstParagraph,
		);
	}
}
