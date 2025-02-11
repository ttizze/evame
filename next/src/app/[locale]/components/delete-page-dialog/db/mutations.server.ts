import { prisma } from "@/lib/prisma";
export async function archivePage(pageId: number, userId: string) {
	try {
		const page = await prisma.page.findFirst({
			where: {
				id: pageId,
				userId,
			},
		});

		if (!page) {
			return { success: false, error: "Page not found or unauthorized" };
		}

		const result = await prisma.page.update({
			where: { id: pageId },
			data: { status: "ARCHIVE" },
		});
		return result;
	} catch (error) {
		console.error("Error archiving page", error);
		throw new Error("Failed to archive page");
	}
}
