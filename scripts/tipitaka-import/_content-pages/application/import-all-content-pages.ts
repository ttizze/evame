import { createServerLogger } from "@/app/_service/logger.server";
import { parseDirSegment } from "../../domain/parse-dir-segment/parse-dir-segment";
import type { TipitakaFileMeta } from "../../types";
import { createContentPage } from "../_pages/application/create-content-page";
import { sortTipitakaFileMetasFromPrimary } from "../utils/file-metas/sort-tipitaka-file-metas";

/**
 * すべてのコンテンツページをインポートする
 *
 * Tipitakaファイルのメタデータから、依存関係を保証しながら
 * 順次コンテンツページを作成します。
 *
 * **処理順序**:
 * Mula（本文）→ Atthakatha → Tika → Other の順で処理することで、
 * 注釈書が参照するムーラのアンカーセグメントが確実に存在することを保証
 *
 * @param tipitakaFileMetas - Tipitakaファイルのメタデータ配列
 * @param categoryPageLookup - カテゴリページのパス → ページIDのルックアップマップ
 * @param rootPageId - ルートページのID
 * @param userId - ページを作成するユーザーのID
 */
export async function importAllContentPages(
	tipitakaFileMetas: TipitakaFileMeta[],
	categoryPageLookup: Map<string, number>,
	rootPageId: number,
	userId: string,
): Promise<void> {
	// 本文から順に処理できるようにソート
	const sortedFileMetas = sortTipitakaFileMetasFromPrimary(tipitakaFileMetas);

	// 各ファイルキー → 作成したページIDのマッピング
	const pageIdByFileKey = new Map<string, number>();

	const CONCURRENCY = 10;
	let currentKind: string | undefined;
	let processedCount = 0;

	for (let i = 0; i < sortedFileMetas.length; i += CONCURRENCY) {
		const fileMetaBatch = sortedFileMetas.slice(i, i + CONCURRENCY);

		// 種類が変わったらログを出力
		const firstKind = fileMetaBatch[0]?.primaryOrCommentary;
		if (firstKind && firstKind !== currentKind) {
			currentKind = firstKind;
			const kindCount = sortedFileMetas.filter(
				(fm) => fm.primaryOrCommentary === currentKind,
			).length;
			console.log(`Processing ${currentKind}: ${kindCount} files`);
		}

		await Promise.all(
			fileMetaBatch.map((fileMeta) =>
				processTipitakaFile(fileMeta, {
					categoryPageLookup,
					rootPageId,
					userId,
					pageIdByFileKey,
				}),
			),
		);

		processedCount += fileMetaBatch.length;
		console.log(
			`  Processed ${processedCount}/${sortedFileMetas.length} files`,
		);
	}
}

interface ProcessFileParams {
	categoryPageLookup: Map<string, number>;
	rootPageId: number;
	userId: string;
	pageIdByFileKey: Map<string, number>;
}

async function processTipitakaFile(
	fileMeta: TipitakaFileMeta,
	params: ProcessFileParams,
): Promise<void> {
	const { categoryPageLookup, rootPageId, userId, pageIdByFileKey } = params;

	const logger = createServerLogger("import-content-page", {
		userId,
		fileKey: fileMeta.fileKey,
		primaryOrCommentary: fileMeta.primaryOrCommentary,
	});

	const parentPath = fileMeta.dirSegments.slice(0, -1).join("/") || "";
	const parentCategoryPageId = categoryPageLookup.get(parentPath) ?? rootPageId;
	const lastSegment = fileMeta.dirSegments[fileMeta.dirSegments.length - 1];
	const { order: pageOrder } = parseDirSegment(lastSegment);

	const fileKeyLower = fileMeta.fileKey.toLowerCase();
	const isMula = fileMeta.primaryOrCommentary?.toUpperCase() === "MULA";

	let anchorContentId: number | null = null;
	if (!isMula && fileMeta.mulaFileKey) {
		const anchorId = pageIdByFileKey.get(fileMeta.mulaFileKey.toLowerCase());
		if (!anchorId) {
			logger.warn(
				{
					mulaFileKey: fileMeta.mulaFileKey,
					fileKey: fileMeta.fileKey,
					primaryOrCommentary: fileMeta.primaryOrCommentary,
				},
				"Anchor page not found for mula file - annotation links will not be created",
			);
		} else {
			anchorContentId = anchorId;
			logger.debug(
				{
					mulaFileKey: fileMeta.mulaFileKey,
					anchorContentId,
					fileKey: fileMeta.fileKey,
				},
				"Anchor content ID found for commentary",
			);
		}
	}

	logger.debug(
		{
			isMula,
			anchorContentId,
			parentId: parentCategoryPageId,
			order: pageOrder,
		},
		"Creating content page",
	);

	const contentPageId = await createContentPage({
		entry: fileMeta,
		parentId: parentCategoryPageId,
		userId,
		order: pageOrder,
		anchorContentId,
	});

	logger.debug(
		{
			contentPageId,
			anchorContentId,
			isMula,
		},
		"Content page created",
	);

	pageIdByFileKey.set(fileKeyLower, contentPageId);
}
