import { prisma } from "@/lib/prisma";

export type PageWithUserAndTranslation = Awaited<
	ReturnType<typeof fetchPagesWithUserAndTranslationChunk>
>[number];

export async function countPublicPages() {
	const count = await prisma.page.count({
		where: {
			status: "PUBLIC",
		},
	});
	return count;
}

export async function fetchPagesWithUserAndTranslationChunk({
	limit,
	offset,
}: {
	limit: number;
	offset: number;
}) {
	const pagesWithUser = await prisma.page.findMany({
		where: {
			status: "PUBLIC",
		},
		select: {
			slug: true,
			updatedAt: true,
			sourceLocale: true,
			user: {
				select: { handle: true },
			},
			translationJobs: {
				where: {
					status: "COMPLETED",
				},
				select: {
					locale: true,
				},
			},
		},
		skip: offset,
		take: limit,
	});
	return pagesWithUser;
}
