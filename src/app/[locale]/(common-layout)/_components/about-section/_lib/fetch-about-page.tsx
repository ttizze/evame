import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchPageAllSection } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_service/fetch-page.server";

export const fetchAboutPage = cache(async (locale: string) => {
	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	const pageDetail = await fetchPageAllSection(pageSlug, locale);

	if (!pageDetail) {
		return notFound();
	}

	return pageDetail;
});
