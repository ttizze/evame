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

	// shared primary key: contents.id = pages.id
	// Prisma では page -> content が参照側なので page を消しても content は残る。
	// 逆に content を削除すると ON DELETE CASCADE で page, segments などが連鎖削除される。
	await prisma.content.delete({
		where: { id: pageId },
	});
	return page;
}
