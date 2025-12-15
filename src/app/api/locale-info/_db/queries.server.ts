import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import {
	pageLocaleTranslationProofs,
	pages,
	translationJobs,
} from "@/drizzle/schema";

/**
 * pageSlugからページのロケール情報を取得
 * - sourceLocale
 * - translationJobs (status = "COMPLETED" のみ)
 * - pageLocaleTranslationProofs (locale と translationProofStatus のみ)
 */
export async function fetchLocaleInfoByPageSlug(pageSlug: string) {
	// 1回のクエリで全て取得（LEFT JOIN を使用）
	const rows = await db
		.select({
			pageId: pages.id,
			sourceLocale: pages.sourceLocale,
			translationJob: translationJobs,
			translationProof: {
				locale: pageLocaleTranslationProofs.locale,
				translationProofStatus:
					pageLocaleTranslationProofs.translationProofStatus,
			},
		})
		.from(pages)
		.leftJoin(
			translationJobs,
			and(
				eq(translationJobs.pageId, pages.id),
				eq(translationJobs.status, "COMPLETED"),
			),
		)
		.leftJoin(
			pageLocaleTranslationProofs,
			eq(pageLocaleTranslationProofs.pageId, pages.id),
		)
		.where(eq(pages.slug, pageSlug));

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
		if (row.translationJob) {
			const key = `${row.translationJob.id}`;
			if (!translationJobsSet.has(key)) {
				translationJobsSet.set(key, row.translationJob);
			}
		}

		// translationProofs を集約（null でない場合のみ）
		if (row.translationProof?.locale) {
			const key = row.translationProof.locale;
			if (!translationProofsSet.has(key)) {
				translationProofsSet.set(key, row.translationProof);
			}
		}
	}

	return {
		sourceLocale: firstRow.sourceLocale,
		translationJobs: Array.from(translationJobsSet.values()),
		translationProofs: Array.from(translationProofsSet.values()),
	};
}
