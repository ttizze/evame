import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchPageDetail } from "@/app/[locale]/_db/page-queries.server";

export const fetchAboutPage = cache(async (locale: string) => {
	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	const pageDetail = await fetchPageDetail(pageSlug, locale, undefined);

	if (!pageDetail) {
		return notFound();
	}

	return pageDetail;
});
