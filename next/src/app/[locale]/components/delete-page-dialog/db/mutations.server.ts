import { prisma } from "@/lib/prisma";

export async function archivePage(pageId: number) {
	return prisma.page.update({
		where: { id: pageId },
		data: {
			status: "ARCHIVE",
		},
	});
}
