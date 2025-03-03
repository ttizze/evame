import { prisma } from "@/lib/prisma";

export async function getPageBySlug(slug: string) {
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
export type PageWithTitleAndTags = Awaited<ReturnType<typeof getPageBySlug>>;

export async function getAllTags() {
	return await prisma.tag.findMany();
}
