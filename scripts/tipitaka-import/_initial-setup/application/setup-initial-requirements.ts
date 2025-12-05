import { ensureMetadataTypes } from "../db/metadata-types";
import { ensureSegmentTypes } from "../db/segment-types";
import { ensureRootPage } from "./ensure-root-page";

/**
 * インポート処理に必要な初期セットアップを行う
 *
 * セグメントタイプ、メタデータタイプを確保し、
 * PRIMARYセグメントタイプを取得し、
 * ルートページを確保します。
 *
 * @param userId - ページを作成するユーザーのID
 * @returns 初期セットアップの結果（ルートページID）
 */
export async function setupInitialRequirements(
	userId: string,
): Promise<{ rootPageId: number }> {
	await ensureSegmentTypes();

	// メタデータタイプを確保
	await ensureMetadataTypes();

	// ルートページを確保
	const rootPageId = await ensureRootPage(userId);

	return {
		rootPageId,
	};
}
