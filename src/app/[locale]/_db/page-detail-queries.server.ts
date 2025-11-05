import { prisma } from "@/lib/prisma";
import { pickBestTranslation } from "../_lib/pick-best-translation";
import type { LinkedSegmentGroup, PageDetail, SegmentForUI } from "../types";
import { selectPageFields, selectSegmentTranslations } from "./queries.server";

export const selectPageDetailFields = (locale = "en") => {
	return {
		...selectPageFields(locale),
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

export async function fetchPageDetail(
	slug: string,
	locale: string,
): Promise<PageDetail | null> {
	const page = await prisma.page.findUnique({
		where: { slug },
		select: selectPageDetailFields(locale),
	});
	if (!page) return null;

	const normalizedSegments = pickBestTranslation(
		page.content.segments,
	) as Array<SegmentForUI & { segmentType?: SegmentForUI["segmentType"] }>;

	const segmentIdList = normalizedSegments.map((segment) => segment.id);
	let linkedSegmentsByTarget = new Map<number, LinkedSegmentGroup[]>();

	if (segmentIdList.length > 0) {
		const links = await prisma.segmentLink.findMany({
			where: { toSegmentId: { in: segmentIdList } },
			select: {
				toSegmentId: true,
				fromSegment: {
					select: {
						id: true,
						number: true,
						text: true,
						segmentType: {
							select: { key: true, label: true },
						},
						...selectSegmentTranslations(locale),
					},
				},
			},
		});

		linkedSegmentsByTarget = links.reduce((map, link) => {
			const normalized = pickBestTranslation([
				link.fromSegment,
			])[0] as SegmentForUI;
			if (!normalized.segmentType) return map;
			const current = map.get(link.toSegmentId) ?? [];
			let group = current.find(
				(item) => item.type.key === normalized.segmentType?.key,
			);
			if (!group) {
				group = {
					type: normalized.segmentType,
					segments: [],
				};
				current.push(group);
				map.set(link.toSegmentId, current);
			}
			group.segments.push(normalized);
			return map;
		}, new Map<number, LinkedSegmentGroup[]>());
	}

	const segmentsWithLinks = normalizedSegments.map((segment) => {
		const linked = linkedSegmentsByTarget.get(segment.id) ?? [];
		return linked.length
			? {
					...segment,
					linkedSegments: linked,
				}
			: segment;
	});

	return {
		...page,
		content: {
			segments: segmentsWithLinks,
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
