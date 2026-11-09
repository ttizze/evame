import { createServerLogger } from "@/app/_service/logger.server";
import { contentToMdastWithSegments } from "@/app/[locale]/_service/content-to-mdast-with-segments";
import { upsertPageAndSegments } from "@/app/[locale]/_service/upsert-page-and-segments";
import type { PageStatus } from "@/db/types";

/**
 * ページの本文を解析し、既存の段落照合と同じ経路で保存する。
 *
 * 処理の流れ:
 * 1. 本文 → MDAST + segments に変換
 * 2. ページとセグメントをデータベースに保存
 */
export async function processPageContent(params: {
	title: string;
	content: string;
	contentFormat: "html" | "markdown";
	pageSlug: string;
	userId: string;
	userLocale: string;
	parentId: number | null;
	order: number;
	status: PageStatus;
}) {
	const logger = createServerLogger("process-page-content", {
		userId: params.userId,
		pageSlug: params.pageSlug,
	});

	const { title, content, contentFormat, userLocale, ...pageParams } = params;

	const { mdastJson, segments, sourceLocale } =
		await contentToMdastWithSegments({
			header: title,
			content,
			contentFormat,
			userLocale,
		});

	logger.debug(
		{ segmentCount: segments.length },
		"Content converted to MDAST and segments",
	);

	const updatedPage = await upsertPageAndSegments({
		...pageParams,
		mdastJson,
		segments,
		sourceLocale,
	});

	logger.debug(
		{ pageId: updatedPage.id },
		"Page and segments upserted successfully",
	);

	return updatedPage;
}
