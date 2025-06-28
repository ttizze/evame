import { prisma } from "@/lib/prisma";

export const selectUserFields = () => {
	return {
		id: true,
		name: true,
		handle: true,
		image: true,
		createdAt: true,
		updatedAt: true,
		profile: true,
		twitterHandle: true,
		totalPoints: true,
		isAI: true,
		plan: true,
	} as const;
};

export async function getPageById(pageId: number) {
	const page = await prisma.page.findUnique({
		where: { id: pageId },
		include: {
			user: {
				select: selectUserFields(),
			},
		},
	});
	return page;
}
