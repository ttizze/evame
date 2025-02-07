import { prisma } from "@/lib/prisma";

export async function toggleLike(
	slug: string,
	userId?: string,
	guestId?: string,
) {
	const page = await prisma.page.findUnique({ where: { slug } });
	if (!page) {
		throw new Error("Page not found");
	}
	const identifier = userId ? { userId } : guestId ? { guestId } : null;
	if (!identifier) {
		throw new Error("Either userId or guestId must be provided");
	}
	const existing = await prisma.likePage.findFirst({
		where: {
			pageId: page.id,
			...identifier,
		},
	});
	if (existing) {
		await prisma.likePage.delete({ where: { id: existing.id } });
		return false;
	}
	await prisma.likePage.create({
		data: {
			pageId: page.id,
			...identifier,
		},
	});
	return true;
}
