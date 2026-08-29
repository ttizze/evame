import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { fetchPaginatedPublicNewestPageListsByTag } from "@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/_db/queries";

const tagInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	page: z.number().int().positive(),
	tagName: z.string(),
});

export const getTagData = createServerFn({ method: "GET" })
	.validator(tagInput)
	.handler(async ({ data }) => {
		return fetchPaginatedPublicNewestPageListsByTag({
			locale: data.locale,
			page: data.page,
			pageSize: 5,
			tagName: data.tagName,
		});
	});
