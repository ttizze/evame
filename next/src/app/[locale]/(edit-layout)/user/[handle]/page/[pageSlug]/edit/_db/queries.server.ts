import { prisma } from "@/lib/prisma";

export async function getPageWithTitleAndTagsBySlug(slug: string) {
	return await prisma.page.findUnique({
		where: { slug },
		include: {
			pageSegments: {
				where: {
					number: 0,
				},
			},
			tagPages: {
				include: {
					tag: true,
				},
			},
		},
	});
}
export type PageWithTitleAndTags = Awaited<
	ReturnType<typeof getPageWithTitleAndTagsBySlug>
>;

export async function getAllTagsWithCount() {
	return await prisma.tag.findMany({
		select: {
			id: true,
			name: true,
			_count: {
				select: { pages: true },
			},
		},
		orderBy: {
			pages: {
				_count: "desc",
			},
		},
	});
}
export type TagWithCount = Awaited<
	ReturnType<typeof getAllTagsWithCount>
>[number];
