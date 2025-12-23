import { notFound } from "next/navigation";
import { cache } from "react";
import {
	fetchPageAnnotationTypes,
	fetchPageDetail,
} from "@/app/[locale]/_db/fetch-page-detail.server";
import {
	fetchPageViewCount,
	fetchTranslationJobs,
} from "@/app/[locale]/_db/page-utility-queries.server";
import { createServerLogger } from "@/lib/logger.server";

const logger = createServerLogger("fetch-page-context");

export const fetchPageContext = cache(async (slug: string, locale: string) => {
	const pageDetail = await fetchPageDetail(slug, locale, {
		includeAnnotations: false,
	});

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

	const raw = titleSegment.text;
	const translated =
		titleSegment.segmentTranslation?.text &&
		titleSegment.segmentTranslation.text !== raw
			? titleSegment.segmentTranslation.text
			: null;

	const title = translated ? `${raw} - ${translated}` : raw;
	if (pageDetail.status === "ARCHIVE") {
		logger.info({ slug, pageId: pageDetail.id }, "Page is archived");
		return notFound();
	}

	const [pageTranslationJobs, pageViewCount] = await Promise.all([
		fetchTranslationJobs(pageDetail.id),
		fetchPageViewCount(pageDetail.id),
	]);
	const annotationTypes = await fetchPageAnnotationTypes(pageDetail.id);

	return {
		pageDetail,
		title,
		pageTranslationJobs,
		pageViewCount,
		annotationTypes,
	};
});
