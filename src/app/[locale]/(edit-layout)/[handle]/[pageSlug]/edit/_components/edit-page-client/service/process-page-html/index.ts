import { createServerLogger } from "@/app/_service/logger.server";
import { htmlToMdastWithSegments } from "@/app/[locale]/_domain/html-to-mdast-with-segments";
import type { PageStatus } from "@/db/types";
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

	const { title, html, ...pageParams } = params;

	logger.debug({ htmlLength: params.html.length }, "Processing page HTML");
	logger.debug({ html: params.html }, "Processing page HTML raw input");

	const { mdastJson, segments } = await htmlToMdastWithSegments({
		header: title,
		html,
	});

	logger.debug(
		{ segmentCount: segments.length },
		"HTML converted to MDAST and segments",
	);

	const updatedPage = await upsertPageAndSegments({
		...pageParams,
		mdastJson,
		segments,
	});

	logger.debug(
		{ pageId: updatedPage.id },
		"Page and segments upserted successfully",
	);

	return updatedPage;
}
