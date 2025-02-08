import { prisma } from "@/lib/prisma";
export async function archivePage(pageId: number, userId: string) {
	const page = await prisma.page.findFirst({
		where: {
			id: pageId,
			userId,
		},
	});

	if (!page) {
		throw new Error("Page not found or unauthorized");
	}

	return prisma.page.update({
		where: { id: pageId },
		data: { status: "ARCHIVE" },
	});
}
