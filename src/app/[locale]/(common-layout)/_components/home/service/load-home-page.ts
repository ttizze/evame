import {
	fetchPageRows,
	fetchTagsMap,
	toPageForList,
} from "@/app/[locale]/_db/page-list.server";
import { loadAboutPage } from "../../about-section/service/load-about-page";
import { loadSocialProofStats } from "../../about-section/service/load-social-proof-stats";

export async function loadHomePage(locale: string) {
	const [pageDetail, stats, newRows, popularRows] = await Promise.all([
		loadAboutPage(locale),
		loadSocialProofStats(),
		fetchPageRows(locale, 1, 5, null, "new"),
		fetchPageRows(locale, 1, 5, null, "popular"),
	]);
	const tags = await fetchTagsMap([
		...new Set([...newRows, ...popularRows].map((row) => row.id)),
	]);
	const totalPages = Math.ceil(stats.articles / 5);
	return {
		pageDetail,
		stats,
		newPages: {
			pageForLists: newRows.map((row) =>
				toPageForList(row, tags.get(row.id) ?? []),
			),
			totalPages,
		},
		popularPages: {
			pageForLists: popularRows.map((row) =>
				toPageForList(row, tags.get(row.id) ?? []),
			),
			totalPages,
		},
	};
}
