import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";

const localeInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});

export const getAboutData = createServerFn({ method: "GET" })
	.validator(localeInput)
	.handler(async ({ data }) => {
		const [{ loadAboutPage }, { querySocialProofStats }] = await Promise.all([
			import(
				"@/app/[locale]/(common-layout)/_components/about-section/service/load-about-page"
			),
			import(
				"@/app/[locale]/(common-layout)/_components/about-section/_db/queries"
			),
		]);
		const [pageDetail, stats] = await Promise.all([
			loadAboutPage(data.locale),
			querySocialProofStats(),
		]);

		return { pageDetail, stats };
	});
