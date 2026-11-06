import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supportedLocaleOptions } from "@/app/_constants/locale";
import { loadHomePage } from "@/app/[locale]/(common-layout)/_components/home/service/load-home-page";

const indexInput = z.object({
	locale: z
		.string()
		.refine(
			(locale) =>
				supportedLocaleOptions.some((option) => option.code === locale),
			"対応していないlocaleです",
		),
});
export type HomeData = Awaited<ReturnType<typeof loadHomePage>>;

export const getIndexData = createServerFn({ method: "GET" })
	.validator(indexInput)
	.handler(({ data }) => loadHomePage(data.locale));
