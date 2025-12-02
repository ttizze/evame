import { createContentPage } from "../../_pages/application/create-content-page";
import type { TipitakaFileMeta } from "../../types";
import {
	buildParagraphAnchorMap,
	buildParagraphSegmentMap,
	getSegmentsForContent,
	linkAnnotationSegments,
	type ParagraphAnchorMap,
} from "../_segment-annotations";
import { findCategoryPageIdFromDirSegments } from "../domain/find-category-page-id";
import { findSegmentTypeIdForTipitakaPrimaryOrCommentary } from "../domain/find-segment-type-id";

/**
 * Tipitakaファイルのメタデータからコンテンツページをインポートする
 * 本文（Mula）の場合はアンカーセグメントを保存し、
 * 注釈書（Atthakatha, Tika）の場合は本文のアンカーセグメントにリンクする
 *
 * 注意: 本文から順に処理する必要がある（Mula → Atthakatha → Tika → Other）
 */
export async function importContentPagesFromTipitakaFiles(
	primaryOrCommentary: TipitakaFileMeta["primaryOrCommentary"],
	tipitakaFileMetas: TipitakaFileMeta[],
	categoryPageLookup: Map<string, number>,
	userId: string,
	primarySegmentTypeId: number,
	commentarySegmentTypeIdByLabel: Map<string, number>,
	generatePageOrderForParent: (parentPageId: number) => number,
	mulaAnchorMapByFileKey: Map<string, ParagraphAnchorMap>,
): Promise<void> {
	if (tipitakaFileMetas.length === 0) return;

	console.log(
		`Processing ${primaryOrCommentary}: ${tipitakaFileMetas.length} files`,
	);

	const CONCURRENCY = 10;
	const primaryOrCommentaryKey = primaryOrCommentary?.toUpperCase?.() ?? "";

	for (let i = 0; i < tipitakaFileMetas.length; i += CONCURRENCY) {
		const fileMetaBatch = tipitakaFileMetas.slice(i, i + CONCURRENCY);
		await Promise.all(
			fileMetaBatch.map(async (tipitakaFileMeta) => {
				const dirSegments = tipitakaFileMeta.dirSegments.slice(0, -1);
				const parentCategoryPageId = findCategoryPageIdFromDirSegments(
					dirSegments,
					categoryPageLookup,
				);
				const pageOrder = generatePageOrderForParent(parentCategoryPageId);
				const segmentTypeId = findSegmentTypeIdForTipitakaPrimaryOrCommentary(
					tipitakaFileMeta.primaryOrCommentary,
					primarySegmentTypeId,
					commentarySegmentTypeIdByLabel,
				);

				const contentPageId = await createContentPage({
					entry: tipitakaFileMeta,
					parentId: parentCategoryPageId,
					userId,
					order: pageOrder,
					segmentTypeId,
				});

				const segments = await getSegmentsForContent(contentPageId);
				const paragraphNumberToSegmentIds = buildParagraphSegmentMap(segments);
				if (paragraphNumberToSegmentIds.size === 0) {
					return;
				}

				// Mula（本文）の場合: アンカーセグメントを特定して保存
				if (primaryOrCommentaryKey === "MULA") {
					const mulaAnchorMap = buildParagraphAnchorMap(
						paragraphNumberToSegmentIds,
						segments,
					);
					mulaAnchorMapByFileKey.set(
						tipitakaFileMeta.fileKey.toLowerCase(),
						mulaAnchorMap,
					);
					return;
				}

				// 注釈書の場合: Mulaのアンカーセグメントにリンク
				if (!tipitakaFileMeta.mulaFileKey) {
					return;
				}

				const mulaAnchorMap = mulaAnchorMapByFileKey.get(
					tipitakaFileMeta.mulaFileKey.toLowerCase(),
				);
				if (!mulaAnchorMap) {
					console.warn(
						`Anchor map not found for mula file: ${tipitakaFileMeta.mulaFileKey}`,
					);
					return;
				}

				for (const [
					paragraphNumber,
					commentarySegmentIds,
				] of paragraphNumberToSegmentIds) {
					const primarySegmentId = mulaAnchorMap.get(paragraphNumber);
					if (!primarySegmentId) continue;

					await linkAnnotationSegments(commentarySegmentIds, primarySegmentId);
				}
			}),
		);
		console.log(
			`  Processed ${Math.min(i + CONCURRENCY, tipitakaFileMetas.length)}/${tipitakaFileMetas.length} files`,
		);
	}
}
