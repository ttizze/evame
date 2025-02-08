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

export async function getTitlePageSegmentId(slug: string) {
	const titlePageSegment = await prisma.page.findFirst({
		where: { slug },
		select: {
			pageSegments: {
				where: {
					number: 0,
				},
				select: {
					id: true,
				},
				take: 1,
			},
		},
	});
	return titlePageSegment?.pageSegments[0]?.id;
}

export async function getAllTags() {
	return await prisma.tag.findMany();
}
