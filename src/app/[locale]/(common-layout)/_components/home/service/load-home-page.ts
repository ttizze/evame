import {
	fetchPageRows,
	fetchTagsMap,
	toPageForList,
} from "@/app/[locale]/_db/page-list.server";
import { loadSocialProofStats } from "../../about-section/service/load-social-proof-stats";

export async function loadHomePage(locale: string) {
	const [stats, newRows, popularRows] = await Promise.all([
		loadSocialProofStats(),
		fetchPageRows(locale, 1, 5, null, "new"),
		fetchPageRows(locale, 1, 5, null, "popular"),
	]);
	const tags = await fetchTagsMap([
		...new Set([...newRows, ...popularRows].map((row) => row.id)),
	]);
	const totalPages = Math.ceil(stats.articles / 5);
	return {
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
