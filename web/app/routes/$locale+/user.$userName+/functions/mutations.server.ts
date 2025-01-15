import { prisma } from "~/utils/prisma";

export async function togglePagePublicStatus(pageId: number) {
	const page = await prisma.page.findUnique({ where: { id: pageId } });
	if (!page) {
		throw new Error("Page not found");
	}
	return prisma.page.update({
		where: { id: pageId },
		data: {
			status: page.status === "PUBLIC" ? "DRAFT" : "PUBLIC",
		},
	});
}

export async function archivePage(pageId: number) {
	return prisma.page.update({
		where: { id: pageId },
		data: {
			status: "ARCHIVE",
		},
	});
}
