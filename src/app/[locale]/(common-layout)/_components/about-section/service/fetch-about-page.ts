import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { loadAboutPage } from "./load-about-page";

export async function fetchAboutPage(locale: string) {
	"use cache";
	cacheLife({ expire: 60 * 60 * 12 });
	cacheTag(`top:about-page:${locale}`);

	const pageDetail = await loadAboutPage(locale);

	if (!pageDetail) {
		return notFound();
	}

	return pageDetail;
}
