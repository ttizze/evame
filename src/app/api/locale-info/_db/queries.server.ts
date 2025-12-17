import { db } from "@/db";

/**
 * pageSlugからページのロケール情報を取得
 * - sourceLocale
 * - translationJobs (status = "COMPLETED" のみ)
 * - pageLocaleTranslationProofs (locale と translationProofStatus のみ)
 */
export async function fetchLocaleInfoByPageSlug(pageSlug: string) {
	// 1回のクエリで全て取得（LEFT JOIN を使用）
	const rows = await db
		.selectFrom("pages")
		.leftJoin("translationJobs", (join) =>
			join
				.onRef("translationJobs.pageId", "=", "pages.id")
				.on("translationJobs.status", "=", "COMPLETED"),
		)
		.leftJoin(
			"pageLocaleTranslationProofs",
			"pageLocaleTranslationProofs.pageId",
			"pages.id",
		)
		.select([
			"pages.id as pageId",
			"pages.sourceLocale",
			"translationJobs.id as translationJobId",
			"translationJobs.pageId as translationJobPageId",
			"translationJobs.userId as translationJobUserId",
			"translationJobs.locale as translationJobLocale",
			"translationJobs.aiModel as translationJobAiModel",
			"translationJobs.status as translationJobStatus",
			"translationJobs.progress as translationJobProgress",
			"translationJobs.error as translationJobError",
			"translationJobs.createdAt as translationJobCreatedAt",
			"translationJobs.updatedAt as translationJobUpdatedAt",
			"pageLocaleTranslationProofs.locale as proofLocale",
			"pageLocaleTranslationProofs.translationProofStatus",
		])
		.where("pages.slug", "=", pageSlug)
		.execute();

	if (rows.length === 0) {
		return null;
	}

	// 最初の行からページ情報を取得
	const firstRow = rows[0];
	if (!firstRow) {
		return null;
	}

	// 重複を排除して関連データを集約
	const translationJobsSet = new Map();
	const translationProofsSet = new Map();

	for (const row of rows) {
		// translationJobs を集約（null でない場合のみ）
		if (row.translationJobId) {
			const key = `${row.translationJobId}`;
			if (!translationJobsSet.has(key)) {
				translationJobsSet.set(key, {
					id: row.translationJobId,
					pageId: row.translationJobPageId,
					userId: row.translationJobUserId,
					locale: row.translationJobLocale,
					aiModel: row.translationJobAiModel,
					status: row.translationJobStatus,
					progress: row.translationJobProgress,
					error: row.translationJobError,
					createdAt: row.translationJobCreatedAt,
					updatedAt: row.translationJobUpdatedAt,
				});
			}
		}

		// translationProofs を集約（null でない場合のみ）
		if (row.proofLocale) {
			const key = row.proofLocale;
			if (!translationProofsSet.has(key)) {
				translationProofsSet.set(key, {
					locale: row.proofLocale,
					translationProofStatus: row.translationProofStatus,
				});
			}
		}
	}

	return {
		sourceLocale: firstRow.sourceLocale,
		translationJobs: Array.from(translationJobsSet.values()),
		translationProofs: Array.from(translationProofsSet.values()),
	};
}
