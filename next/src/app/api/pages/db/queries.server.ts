import { prisma } from "@/lib/prisma";
export const fetchPagesWithUser = async () => {
	const pages = await prisma.page.findMany({
		select: {
			slug: true,
			updatedAt: true,
			user: {
				select: { handle: true },
			},
		},
	});
	return pages;
};
export type PageWithUser = Awaited<
	ReturnType<typeof fetchPagesWithUser>
>[number];
