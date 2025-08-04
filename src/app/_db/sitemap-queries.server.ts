import { fetchLatestPageTranslationJobs } from "@/app/[locale]/_db/page-queries.server";
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
			id: true,
			slug: true,
			updatedAt: true,
			user: {
				select: { handle: true },
			},
		},
		skip: offset,
		take: limit,
	});
	const pagesWithTranslation = await Promise.all(
		pagesWithUser.map(async (page) => {
			const translationJobs = await fetchLatestPageTranslationJobs(page.id);
			return { ...page, translationJobs };
		}),
	);
	return pagesWithTranslation;
}
