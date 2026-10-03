import { mdastToText } from "@/app/[locale]/_domain/mdast-to-text";
import type { PageDetail } from "@/app/[locale]/types";
import {
	queryChildPagesTree,
	queryCompletedTranslationLocales,
	queryPageCounts,
	queryPageNavigationData,
	queryPageViewCount,
} from "../_db/queries";
import { preparePageMdast } from "./prepare-page-mdast";

export async function loadPageContentData(
	pageDetail: PageDetail,
	locale: string,
) {
	const [
		pageCounts,
		pageViewCount,
		navigationData,
		childPages,
		locales,
		mdast,
	] = await Promise.all([
		queryPageCounts(pageDetail.id),
		queryPageViewCount(pageDetail.id),
		queryPageNavigationData(pageDetail.id, locale),
		queryChildPagesTree(pageDetail.id, locale),
		queryCompletedTranslationLocales(pageDetail.id),
		preparePageMdast(pageDetail.mdastJson),
	]);

	const preparedPageDetail = { ...pageDetail, mdastJson: mdast };
	const description = (await mdastToText(mdast)).slice(0, 200);

	return {
		pageDetail: preparedPageDetail,
		pageCounts,
		pageViewCount,
		navigationData,
		childPages,
		completedTranslationLocales: locales,
		description,
	};
}
