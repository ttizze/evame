import { notFound } from "next/navigation";
import { cache } from "react";
import { createServerLogger } from "@/app/_service/logger.server";
import { fetchPageDetail } from "@/app/[locale]/_db/fetch-page-detail.server";
import {
	fetchPageViewCount,
	fetchTranslationJobs,
} from "@/app/[locale]/_db/page-utility-queries.server";

const logger = createServerLogger("fetch-page-context");

export const fetchPageContext = cache(async (slug: string, locale: string) => {
	const pageDetail = await fetchPageDetail(slug, locale);

	if (!pageDetail) {
		logger.warn({ slug, locale }, "Page not found in database");
		return notFound();
	}

	const titleSegment = pageDetail?.content.segments.find((b) => b.number === 0);
	if (!titleSegment) {
		logger.warn(
			{
				slug,
				availableSegments: pageDetail.content.segments.map((s) => s.number),
				pageId: pageDetail.id,
			},
			"Title segment (number=0) not found",
		);
		return notFound();
	}

	const title = titleSegment.translationText
		? `${titleSegment.text} - ${titleSegment.translationText}`
		: titleSegment.text;
	if (pageDetail.status === "ARCHIVE") {
		logger.info({ slug, pageId: pageDetail.id }, "Page is archived");
		return notFound();
	}

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
