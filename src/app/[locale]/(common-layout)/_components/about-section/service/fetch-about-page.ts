import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";

export async function fetchAboutPage(locale: string) {
	"use cache";
	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag(`top:about-page:${locale}`);

	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	const pageDetail = await fetchPageDetail(pageSlug, locale);

	if (!pageDetail) {
		return notFound();
	}

	return pageDetail;
}
