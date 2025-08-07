import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSegmentBundles } from "../_lib/to-segment-bundles";
import { transformPageSegments } from "../_lib/transform-page-segments";
import type { PageDetail } from "../types";
import { selectUserFields } from "./queries.server";

export const selectPageDetailFields = (locale = "en") => {
	return {
		user: {
			select: selectUserFields(),
		},
		tagPages: {
			include: {
				tag: true,
			},
		},
		pageSegments: {
			include: {
				pageSegmentTranslations: {
					where: { locale, isArchived: false },
					orderBy: [
						{ point: Prisma.SortOrder.desc },
						{ createdAt: Prisma.SortOrder.desc },
					],
					take: 1,
					include: {
						user: {
							select: selectUserFields(),
						},
					},
				},
			},
		},
		_count: {
			select: {
				pageComments: true,
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
		include: {
			...selectPageDetailFields(locale),
		},
	});

	if (!page) return null;

	const normalized = transformPageSegments(page.pageSegments);
	const segmentBundles = toSegmentBundles("page", page.id, normalized);

	return {
		...page,
		createdAt: page.createdAt.toISOString(),
		segmentBundles,
	};
}

export async function fetchPageWithTitleAndComments(pageId: number) {
	const pageWithComments = await prisma.page.findFirst({
		where: { id: pageId },
		include: {
			pageSegments: { where: { number: 0 } },
			pageComments: {
				include: {
					pageCommentSegments: true,
				},
			},
		},
	});
	if (!pageWithComments) return null;
	const title = pageWithComments?.pageSegments[0].text;
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
			pageSegments: {
				select: {
					id: true,
					number: true,
					text: true,
				},
			},
		},
	});

	if (!pageWithSegments) return null;
	const title = pageWithSegments.pageSegments.filter(
		(item) => item.number === 0,
	)[0].text;

	return {
		...pageWithSegments,
		title,
	};
}
