import { fetchPageWithTranslations } from "@/app/[locale]/_db/queries.server";
import { notFound } from "next/navigation";
import { cache } from "react";

export const fetchAboutPage = cache(async (locale: string) => {
	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	const pageWithTranslations = await fetchPageWithTranslations(
		pageSlug,
		locale,
		undefined,
	);

	if (!pageWithTranslations) {
		return notFound();
	}

	return pageWithTranslations;
});
