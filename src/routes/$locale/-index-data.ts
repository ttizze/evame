import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const indexInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});

export const getIndexData = createServerFn({ method: "GET" })
	.inputValidator(indexInput)
	.handler(async ({ data }) => {
		const { fetchTipitakaPageTree } = await import(
			"@/app/[locale]/(common-layout)/_components/tipitaka-page-list/db/queries"
		);
		return fetchTipitakaPageTree(data.locale);
	});
