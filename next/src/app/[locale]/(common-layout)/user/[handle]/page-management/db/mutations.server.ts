import { prisma } from "@/lib/prisma";

export async function archivePages(pageIds: number[]) {
	return prisma.page.updateMany({
		where: { id: { in: pageIds } },
		data: {
			status: "ARCHIVE",
		},
	});
}
