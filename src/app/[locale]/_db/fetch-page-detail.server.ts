import {
	selectPageFields,
	selectSegmentFields,
} from "@/app/[locale]/_db/queries.server";
import { pickBestTranslation } from "@/app/[locale]/_utils/pick-best-translation";
import { prisma } from "@/lib/prisma";

const selectPageDetailFields = (locale = "en") => {
	return {
		...selectPageFields(locale, undefined, true),
		mdastJson: true,
		updatedAt: true,
		userId: true,
		tagPages: {
			include: {
				tag: true,
			},
		},
		_count: {
			select: {
				pageComments: true,
				children: true,
			},
		},
	};
};

/**
 * PRIMARYセグメントがない場合（例: attakata単独ページ）、COMMENTARYセグメントをフォールバックとして取得する
 */
async function fetchCommentarySegmentsAsFallback(slug: string, locale: string) {
	const pageWithCommentary = await prisma.page.findUnique({
		where: { slug },
		select: {
			content: {
				select: {
					segments: {
						where: {
							segmentType: { key: "COMMENTARY" },
						},
						orderBy: { number: "asc" },
						select: {
							...selectSegmentFields(locale),
							annotations: {
								select: {
									annotationSegment: {
										select: selectSegmentFields(locale),
									},
								},
							},
						},
					},
				},
			},
		},
	});
	return pageWithCommentary?.content.segments ?? [];
}

export async function fetchPageDetail(slug: string, locale: string) {
	const page = await prisma.page.findUnique({
		where: { slug },
		select: selectPageDetailFields(locale),
	});
	if (!page) {
		return null;
	}

	const segments =
		page.content.segments.length > 0
			? page.content.segments
			: await fetchCommentarySegmentsAsFallback(slug, locale);

	// 各セグメントのannotations内のannotationSegmentにpickBestTranslationを適用
	const segmentsWithNormalizedAnnotations = segments.map((segment) => {
		if (!segment.annotations || segment.annotations.length === 0) {
			return segment;
		}

		const annotationSegments = segment.annotations.map(
			(link) => link.annotationSegment,
		);
		const normalizedAnnotationSegments =
			pickBestTranslation(annotationSegments);

		return {
			...segment,
			annotations: segment.annotations.map((link, index) => ({
				...link,
				annotationSegment: normalizedAnnotationSegments[index],
			})),
		};
	});

	// メインの segments に pickBestTranslation を適用
	const normalizedSegments = pickBestTranslation(
		segmentsWithNormalizedAnnotations,
	);

	return {
		...page,
		content: {
			segments: normalizedSegments,
		},
	};
}
