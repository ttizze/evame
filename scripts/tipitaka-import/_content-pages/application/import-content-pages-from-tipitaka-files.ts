import { parseDirSegment } from "../../domain/parse-dir-segment";
import type { TipitakaFileMeta } from "../../types";
import { createContentPage } from "../_pages/application/create-content-page";
import {
	buildParagraphAnchorMap,
	buildParagraphSegmentMap,
	findSegmentsByContentId,
	linkAnnotationSegments,
	type ParagraphAnchorMap,
} from "../_segment-annotations";

interface ImportContentPagesParams {
	tipitakaFileMetas: TipitakaFileMeta[];
	categoryPageLookup: Map<string, number>;
	rootPageId: number;
	userId: string;
	mulaAnchorMapByFileKey: Map<string, ParagraphAnchorMap>;
}

/**
 * Tipitakaファイルのメタデータからコンテンツページをインポートする
 * 本文（Mula）の場合はアンカーセグメントを保存し、
 * 注釈書（Atthakatha, Tika）の場合は本文のアンカーセグメントにリンクする
 *
 * 注意: 本文から順に処理する必要がある（Mula → Atthakatha → Tika → Other）
 */
export async function importContentPagesFromTipitakaFiles(
	params: ImportContentPagesParams,
): Promise<void> {
	const {
		tipitakaFileMetas,
		categoryPageLookup,
		rootPageId,
		userId,
		mulaAnchorMapByFileKey,
	} = params;

	if (tipitakaFileMetas.length === 0) return;

	console.log(
		`Processing ${tipitakaFileMetas[0]?.primaryOrCommentary}: ${tipitakaFileMetas.length} files`,
	);

	const CONCURRENCY = 10;

	for (let i = 0; i < tipitakaFileMetas.length; i += CONCURRENCY) {
		const fileMetaBatch = tipitakaFileMetas.slice(i, i + CONCURRENCY);
		await Promise.all(
			fileMetaBatch.map((fileMeta) =>
				processTipitakaFile(fileMeta, {
					categoryPageLookup,
					rootPageId,
					userId,
					mulaAnchorMapByFileKey,
				}),
			),
		);
		console.log(
			`  Processed ${Math.min(i + CONCURRENCY, tipitakaFileMetas.length)}/${tipitakaFileMetas.length} files`,
		);
	}
}

interface ProcessFileParams {
	categoryPageLookup: Map<string, number>;
	rootPageId: number;
	userId: string;
	mulaAnchorMapByFileKey: Map<string, ParagraphAnchorMap>;
}

async function processTipitakaFile(
	fileMeta: TipitakaFileMeta,
	params: ProcessFileParams,
): Promise<void> {
	const { categoryPageLookup, rootPageId, userId, mulaAnchorMapByFileKey } =
		params;

	const parentPath = fileMeta.dirSegments.slice(0, -1).join("/") || "";
	const parentCategoryPageId = categoryPageLookup.get(parentPath) ?? rootPageId;
	const lastSegment = fileMeta.dirSegments[fileMeta.dirSegments.length - 1];
	const { order: pageOrder } = parseDirSegment(lastSegment);

	const contentPageId = await createContentPage({
		entry: fileMeta,
		parentId: parentCategoryPageId,
		userId,
		order: pageOrder,
	});

	const segments = await findSegmentsByContentId(contentPageId);
	const paragraphNumberToSegmentIds = buildParagraphSegmentMap(segments);
	if (paragraphNumberToSegmentIds.size === 0) return;

	const isMula = fileMeta.primaryOrCommentary?.toUpperCase() === "MULA";
	if (isMula) {
		const mulaAnchorMap = buildParagraphAnchorMap(
			paragraphNumberToSegmentIds,
			segments,
		);
		mulaAnchorMapByFileKey.set(fileMeta.fileKey.toLowerCase(), mulaAnchorMap);
		return;
	}

	if (!fileMeta.mulaFileKey) return;

	const mulaAnchorMap = mulaAnchorMapByFileKey.get(
		fileMeta.mulaFileKey.toLowerCase(),
	);
	if (!mulaAnchorMap) {
		console.warn(`Anchor map not found for mula file: ${fileMeta.mulaFileKey}`);
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
}
