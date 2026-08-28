import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";

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
	.inputValidator(tagInput)
	.handler(async ({ data }) => {
		// Keep the server-only database module out of the route/client bundle.
		const { fetchPaginatedPublicNewestPageListsByTag } = await import(
			"@/app/[locale]/(common-layout)/_components/page/new-page-list-by-tag/_db/queries"
		);
		return fetchPaginatedPublicNewestPageListsByTag({
			locale: data.locale,
			page: data.page,
			pageSize: 5,
			tagName: data.tagName,
		});
	});
