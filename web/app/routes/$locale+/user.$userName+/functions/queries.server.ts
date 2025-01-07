import { prisma } from "~/utils/prisma";

export async function fetchPageById(pageId: number) {
	return await prisma.page.findUnique({
		where: { id: pageId },
	});
}

export async function getFollowCounts(userId: number) {
	const [followers, following] = await Promise.all([
		prisma.follow.count({
			where: { followingId: userId },
		}),
		prisma.follow.count({
			where: { followerId: userId },
		}),
	]);

	return { followers, following };
}
