import { prisma } from "@/lib/prisma";
import { pickBestTranslation } from "../_lib/pick-best-translation";
import { selectPageFields, selectSegmentFields } from "./queries.server";

export const selectPageDetailFields = (locale = "en") => {
	return {
		...selectPageFields(locale, undefined, true),
		// PageDetail 型が要求するベースフィールド
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
 * PRIMARYセグメントがない場合（例: attakata単独ページ）、COMMENTARYセグメントを取得する
 * ページ表示時に使用するメインセグメントを解決する
 */
async function resolveMainDisplaySegments<T extends Array<unknown>>(
	slug: string,
	locale: string,
	primarySegments: T,
): Promise<T> {
	// PRIMARYセグメントがあればそれを返す
	if (primarySegments.length > 0) {
		return primarySegments;
	}

	// PRIMARYセグメントがない場合、COMMENTARYセグメントを取得
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

	return (pageWithCommentary?.content.segments ?? []) as T;
}

export async function fetchPageDetail(slug: string, locale: string) {
	const page = await prisma.page.findUnique({
		where: { slug },
		select: selectPageDetailFields(locale),
	});
	if (!page) {
		return null;
	}

	const segments = await resolveMainDisplaySegments(
		slug,
		locale,
		page.content.segments,
	);

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

export async function fetchPageWithTitleAndComments(pageId: number) {
	const pageWithComments = await prisma.page.findFirst({
		where: { id: pageId },
		include: {
			content: {
				select: {
					segments: { where: { number: 0 }, select: { text: true } },
				},
			},
			pageComments: {
				include: {
					content: {
						select: {
							segments: {
								select: { text: true, number: true },
							},
						},
					},
				},
			},
		},
	});
	if (!pageWithComments) return null;
	const title = pageWithComments.content.segments[0]?.text;
	if (!title) return null;
	return {
		...pageWithComments,
		title,
	};
}

export async function fetchPageWithPageSegments(pageId: number) {
	const pageWithSegments = await prisma.page.findFirst({
		where: { id: pageId },
		select: {
			id: true,
			slug: true,
			createdAt: true,
			content: {
				select: {
					segments: { select: { id: true, number: true, text: true } },
				},
			},
		},
	});

	if (!pageWithSegments) return null;
	const titleSegment = pageWithSegments.content.segments.filter(
		(item) => item.number === 0,
	)[0];
	if (!titleSegment) {
		throw new Error(
			`Page ${pageWithSegments.id} (slug: ${pageWithSegments.slug}) is missing required title segment (number: 0). This indicates data corruption.`,
		);
	}
	const title = titleSegment.text;

	return {
		...pageWithSegments,
		title,
	};
}
