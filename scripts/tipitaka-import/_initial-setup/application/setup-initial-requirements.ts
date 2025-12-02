import type { PageWithContent } from "../../types";
import { ensureMetadataTypes } from "../db/metadata-types";
import { ensureSegmentTypes } from "../db/segment-types";
import { derivePrimaryAndCommentary } from "../domain/derive-primary-and-commentary";
import { ensureRootPage } from "./ensure-root-page";

interface InitialSetupResult {
	primarySegmentType: { id: number; key: string; label: string };
	commentarySegmentTypeIdByLabel: Map<string, number>;
	rootPage: PageWithContent;
}

/**
 * インポート処理に必要な初期セットアップを行う
 *
 * セグメントタイプ、メタデータタイプを確保し、
 * PRIMARYセグメントタイプとCOMMENTARYセグメントタイプのマッピングを作成し、
 * ルートページを確保します。
 *
 * @param userId - ページを作成するユーザーのID
 * @returns 初期セットアップの結果（PRIMARYセグメントタイプ、COMMENTARYマッピング、ルートページ）
 */
export async function setupInitialRequirements(
	userId: string,
): Promise<InitialSetupResult> {
	// セグメント種別を upsert し、取得
	const segmentTypes = await ensureSegmentTypes();

	const { primarySegmentType, commentarySegmentTypeIdByLabel } =
		derivePrimaryAndCommentary(segmentTypes);

	// メタデータタイプを確保
	await ensureMetadataTypes();

	// ルートページを確保
	const rootPage = await ensureRootPage(userId, primarySegmentType.id);

	return {
		primarySegmentType,
		commentarySegmentTypeIdByLabel,
		rootPage,
	};
}
