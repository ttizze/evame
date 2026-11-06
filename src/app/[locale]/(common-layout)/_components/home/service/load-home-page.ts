import {
	fetchPageRows,
	fetchTagsMap,
	toPageForList,
} from "@/app/[locale]/_db/page-list.server";

export async function loadHomePage(locale: string) {
	const [newRows, popularRows] = await Promise.all([
		fetchPageRows(locale, 1, 5, null, "new"),
		fetchPageRows(locale, 1, 5, null, "popular"),
	]);
	const tags = await fetchTagsMap([
		...new Set([...newRows, ...popularRows].map((row) => row.id)),
	]);
	return {
		newPages: {
			pageForLists: newRows.map((row) =>
				toPageForList(row, tags.get(row.id) ?? []),
			),
		},
		popularPages: {
			pageForLists: popularRows.map((row) =>
				toPageForList(row, tags.get(row.id) ?? []),
			),
		},
	};
}
