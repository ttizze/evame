import { createServerLogger } from "@/app/_service/logger.server";
import type { SegmentDraft } from "@/app/[locale]/_domain/remark-hash-and-segments";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import type { JsonValue, PageStatus } from "@/db/types";
import { syncSegmentMetadataAndAnnotationLinks } from "../sync-segment-metadata-and-annotation-links";
import { upsertPage } from "./db/mutations.server";
/**
 * ページとセグメントをupsertする（ユースケースフロー）
 *
 * 処理の流れ:
 * 1. ページをupsert
 * 2. セグメントを同期
 * 3. メタデータとアノテーションリンクを同期
 */
export async function upsertPageAndSegments(p: {
	pageSlug: string;
	userId: string;
	mdastJson: JsonValue;
	sourceLocale: string;
	segments: SegmentDraft[];
	segmentTypeId: number | null;
	parentId: number | null;
	order: number;
	anchorContentId: number | null;
	status: PageStatus;
}) {
	const logger = createServerLogger("upsert-page-and-segments", {
		userId: p.userId,
		pageSlug: p.pageSlug,
	});

	logger.debug(
		{
			segmentCount: p.segments.length,
			segmentTypeId: p.segmentTypeId,
			status: p.status,
		},
		"Starting transaction to upsert page and segments",
	);

	try {
		const result = await db.transaction().execute(async (tx) => {
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
			const hashToSegmentId = await syncSegments(
				tx,
				page.id,
				p.segments,
				p.segmentTypeId,
			);

			// application: メタデータとアノテーションリンクを同期
			await syncSegmentMetadataAndAnnotationLinks(
				tx,
				hashToSegmentId,
				p.segments,
				page.id,
				p.anchorContentId,
			);

			return page;
		});

		logger.debug({ pageId: result.id }, "Transaction completed successfully");

		return result;
	} catch (error) {
		logger.error({ err: error }, "Transaction failed");
		throw error;
	}
}
