import { createServerLogger } from "@/app/_service/logger.server";
import { notifyPagePublication } from "@/app/_service/notify-page-publication";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { runTransaction } from "@/db/transaction";
import type { JsonValue, PageStatus } from "@/db/types";
import { upsertPage } from "./db/mutations.server";
/**
 * ページとセグメントをupsertする（ユースケースフロー）
 *
 * 処理の流れ:
 * 1. ページをupsert
 * 2. セグメントを同期
 */
export async function upsertPageAndSegments(p: {
	pageSlug: string;
	userId: string;
	mdastJson: JsonValue;
	sourceLocale: string;
	segments: SegmentDraft[];
	parentId: number | null;
	order: number;
	status: PageStatus;
}) {
	const logger = createServerLogger("upsert-page-and-segments", {
		userId: p.userId,
		pageSlug: p.pageSlug,
	});

	logger.debug(
		{
			segmentCount: p.segments.length,
			status: p.status,
		},
		"Starting transaction to upsert page and segments",
	);

	try {
		const result = await runTransaction(async (tx) => {
			// db操作: ページをupsert
			const page = await upsertPage(tx, {
				pageSlug: p.pageSlug,
				userId: p.userId,
				mdastJson: p.mdastJson,
				sourceLocale: p.sourceLocale,
				parentId: p.parentId,
				order: p.order,
				status: p.status,
			});

			// db操作: セグメントを同期
			await syncSegments(tx, page.id, p.segments);
			await notifyPagePublication(tx, page.id);

			return page;
		});

		logger.debug({ pageId: result.id }, "Transaction completed successfully");

		return result;
	} catch (error) {
		logger.error({ err: error }, "Transaction failed");
		throw error;
	}
}
