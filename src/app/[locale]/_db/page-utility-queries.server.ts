import { prisma } from "@/lib/prisma";

export async function fetchLatestPageTranslationJobs(pageId: number) {
	const locales = await prisma.translationJob.findMany({
		where: { pageId },
		select: { locale: true },
		distinct: ["locale"],
	});

	// 2. 各localeについて最新のレコードを取得
	const results = await Promise.all(
		locales.map(({ locale }) =>
			prisma.translationJob.findFirst({
				where: {
					pageId,
					locale,
				},
				orderBy: { createdAt: "desc" },
			}),
		),
	);

	// nullでないレコードのみを返す
	return results.filter((record) => record !== null);
}

export async function fetchPageIdBySlug(slug: string) {
	return await prisma.page.findFirst({
		where: { slug },
		select: { id: true },
	});
}

export async function fetchPageViewCount(pageId: number): Promise<number> {
	const view = await prisma.pageView.findUnique({
		where: { pageId },
		select: { count: true },
	});
	return view?.count ?? 0;
}

export async function fetchPageViewCounts(
	pageIds: number[],
): Promise<Record<number, number>> {
	if (pageIds.length === 0) return {};
	const views = await prisma.pageView.findMany({
		where: { pageId: { in: pageIds } },
		select: { pageId: true, count: true },
	});
	return views.reduce<Record<number, number>>((acc, v) => {
		acc[v.pageId] = v.count;
		return acc;
	}, {});
}
