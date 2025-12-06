import type { PageStatus } from "@prisma/client";
import { htmlToMdastWithSegments } from "@/app/[locale]/_domain/html-to-mdast-with-segments";
import { createServerLogger } from "@/lib/logger.server";
import { upsertPageAndSegments } from "../upsert-page-and-segments";

/**
 * ページのHTMLを処理してデータベースに保存する（ユースケースフロー）
 *
 * 処理の流れ:
 * 1. HTML → MDAST + segments に変換
 * 2. ページとセグメントをデータベースに保存
 */
export async function processPageHtml(params: {
	title: string;
	html: string;
	pageSlug: string;
	userId: string;
	sourceLocale: string;
	segmentTypeId: number | null;
	parentId: number | null;
	order: number;
	anchorContentId: number | null;
	status: PageStatus;
}) {
	const logger = createServerLogger("process-page-html", {
		userId: params.userId,
		pageSlug: params.pageSlug,
	});

	logger.debug({ htmlLength: params.html.length }, "Processing page HTML");

	const { mdastJson, segments } = await htmlToMdastWithSegments({
		header: params.title,
		html: params.html,
	});

	logger.debug(
		{ segmentCount: segments.length },
		"HTML converted to MDAST and segments",
	);

	const updatedPage = await upsertPageAndSegments({
		pageSlug: params.pageSlug,
		userId: params.userId,
		title: params.title,
		mdastJson,
		sourceLocale: params.sourceLocale,
		segments,
		segmentTypeId: params.segmentTypeId,
		parentId: params.parentId,
		order: params.order,
		anchorContentId: params.anchorContentId,
		status: params.status,
	});

	logger.debug(
		{ pageId: updatedPage.id },
		"Page and segments upserted successfully",
	);

	return updatedPage;
}
