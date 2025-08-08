import { prisma } from "@/lib/prisma";

export async function fetchTranslationJobs(pageId: number) {
	// 単一クエリで各localeの最新COMPLETEDを取得
	return prisma.translationJob.findMany({
		where: { pageId, status: "COMPLETED" },
		orderBy: [{ locale: "asc" }, { createdAt: "desc" }],
		distinct: ["locale"],
	});
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
