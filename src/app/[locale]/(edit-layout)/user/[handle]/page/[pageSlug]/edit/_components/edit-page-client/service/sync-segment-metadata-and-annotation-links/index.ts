import type { TransactionClient } from "@/app/[locale]/_db/sync-segments";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { createServerLogger } from "@/lib/logger.server";
import { syncAnnotationLinksByParagraphNumber } from "../sync-annotation-links-by-paragraph-number";
import { syncSegmentMetadata } from "./db/mutations.server";
import { collectMetadataDrafts } from "./domain/collect-metadata-drafts";
import { groupByParagraphNumber } from "./domain/group-by-paragraph-number";

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

	// domainロジック: 段落番号ごとにグループ化
	const paragraphNumberToAnnotationSegmentIds = groupByParagraphNumber(
		hashToSegmentId,
		segments,
	);

	// db操作: メタデータを同期
	await syncSegmentMetadata(tx, segmentIds, metadataDrafts);

	// db操作: 段落番号がある場合、アノテーションリンクを作成
	if (paragraphNumberToAnnotationSegmentIds.size > 0) {
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
		);
	}
}
