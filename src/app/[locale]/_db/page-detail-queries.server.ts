import { prisma } from "@/lib/prisma";
import { normalizeSegments } from "../_lib/normalize-segments";
import type { PageDetail } from "../types";
import { selectPageFields } from "./queries.server";

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
	return {
		...page,
		content: {
			segments: normalizeSegments(page.content.segments),
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
