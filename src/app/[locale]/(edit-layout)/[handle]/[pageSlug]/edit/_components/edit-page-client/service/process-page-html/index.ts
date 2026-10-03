import { createServerLogger } from "@/app/_service/logger.server";
import { htmlToMdastWithSegments } from "@/app/[locale]/_service/html-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/_service/upsert-page-and-segments";
import type { PageStatus } from "@/db/types";

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
	parentId: number | null;
	order: number;
	status: PageStatus;
}) {
	const logger = createServerLogger("process-page-html", {
		userId: params.userId,
		pageSlug: params.pageSlug,
	});

	const { title, html, ...pageParams } = params;

	logger.debug({ htmlLength: params.html.length }, "Processing page HTML");

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
