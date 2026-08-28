import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { fetchPaginatedNewPageLists } from "@/app/[locale]/_db/page-list.server";

const newPagesInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	page: z.number().int().positive(),
});

export const getNewPagesData = createServerFn({ method: "GET" })
	.validator(newPagesInput)
	.handler(async ({ data }) => {
		return fetchPaginatedNewPageLists({
			locale: data.locale,
			page: data.page,
			pageSize: 5,
		});
	});
