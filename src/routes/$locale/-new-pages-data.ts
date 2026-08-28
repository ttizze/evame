import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";

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
	.inputValidator(newPagesInput)
	.handler(async ({ data }) => {
		// Keep the server-only database module out of the route/client bundle.
		const { fetchPaginatedNewPageLists } = await import(
			"@/app/[locale]/_db/page-list.server"
		);
		return fetchPaginatedNewPageLists({
			locale: data.locale,
			page: data.page,
			pageSize: 5,
		});
	});
