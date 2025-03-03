import { prisma } from "@/lib/prisma";
export async function getPagesByIds(pageIds: number[]) {
	const pages = await prisma.page.findMany({
		where: { id: { in: pageIds } },
	});
	return pages;
}
