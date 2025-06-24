import { prisma } from "@/lib/prisma";

export async function incrementPageView(pageId: number) {
	return prisma.pageView.upsert({
		where: { pageId },
		update: { count: { increment: 1 } },
		create: { pageId, count: 1 },
	});
}
