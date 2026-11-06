import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { loadAboutPage } from "@/app/[locale]/(common-layout)/_components/about-section/service/load-about-page";

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
	.validator(indexInput)
	.handler(({ data }) => loadAboutPage(data.locale));
