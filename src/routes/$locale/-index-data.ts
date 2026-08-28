import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import {
	fetchPaginatedNewPageLists,
	fetchPaginatedPopularPageLists,
} from "@/app/[locale]/_db/page-list.server";
import { querySocialProofStats } from "@/app/[locale]/(common-layout)/_components/about-section/_db/queries";
import { loadAboutPage } from "@/app/[locale]/(common-layout)/_components/about-section/service/load-about-page";
import { fetchTipitakaPageTree } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/db/queries";
import type { TipitakaPageTreeNode } from "@/app/[locale]/(common-layout)/_components/tipitaka-page-list/domain/extract-tipitaka-page-tree";
import type { PageDetail, PageForList } from "@/app/[locale]/types";

const indexInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});
type PaginatedPageLists = {
	pageForLists: PageForList[];
	totalPages: number;
};

type SocialProofStats = {
	articles: number;
	translations: number;
	languages: number;
};

export type HomeData = {
	pageDetail: PageDetail | null;
	stats: SocialProofStats;
	newPages: PaginatedPageLists;
	popularPages: PaginatedPageLists;
	tipitakaPages: TipitakaPageTreeNode[];
};

export const getIndexData = createServerFn({ method: "GET" })
	.validator(indexInput)
	.handler(async ({ data }): Promise<HomeData> => {
		const [pageDetail, stats, newPages, popularPages, tipitakaPages] =
			await Promise.all([
				loadAboutPage(data.locale),
				querySocialProofStats(),
				fetchPaginatedNewPageLists({
					locale: data.locale,
					page: 1,
					pageSize: 5,
				}),
				fetchPaginatedPopularPageLists({
					locale: data.locale,
					page: 1,
					pageSize: 5,
				}),
				fetchTipitakaPageTree(data.locale),
			]);

		return { pageDetail, stats, newPages, popularPages, tipitakaPages };
	});
