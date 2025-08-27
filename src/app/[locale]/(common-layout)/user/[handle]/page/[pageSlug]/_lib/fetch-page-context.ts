import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchPageDetail } from "@/app/[locale]/_db/page-detail-queries.server";
import {
	fetchPageViewCount,
	fetchTranslationJobs,
} from "@/app/[locale]/_db/page-utility-queries.server";
import { incrementPageView } from "../_db/mutations.server";

export const fetchPageContext = cache(async (slug: string, locale: string) => {
	const pageDetail = await fetchPageDetail(slug, locale);
	const titleSegment = pageDetail?.content.segments.find((b) => b.number === 0);
	if (!titleSegment) {
		return notFound();
	}

	const raw = titleSegment.text;
	const translated =
		titleSegment.segmentTranslation?.text &&
		titleSegment.segmentTranslation.text !== raw
			? titleSegment.segmentTranslation.text
			: null;

	const title = translated ? `${raw} - ${translated}` : raw;
	if (!pageDetail || pageDetail.status === "ARCHIVE") {
		return notFound();
	}

	await incrementPageView(pageDetail.id);

	const [pageTranslationJobs, pageViewCount] = await Promise.all([
		fetchTranslationJobs(pageDetail.id),
		fetchPageViewCount(pageDetail.id),
	]);

	return {
		pageDetail,
		title,
		pageTranslationJobs,
		pageViewCount,
	};
});
