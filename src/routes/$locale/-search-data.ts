import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { fetchSearchResults } from "@/app/[locale]/(common-layout)/search/_db/queries";
import { CATEGORIES } from "@/app/[locale]/(common-layout)/search/constants";

const searchInput = z.object({
	category: z.enum(CATEGORIES),
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
	page: z.number().int().positive(),
	query: z.string(),
	tagPage: z.enum(["true", "false"]),
});

export const getSearchData = createServerFn({ method: "GET" })
	.validator(searchInput)
	.handler(async ({ data }) => {
		return fetchSearchResults(data);
	});
