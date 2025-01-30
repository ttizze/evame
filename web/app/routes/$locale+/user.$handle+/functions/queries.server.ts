import { prisma } from "~/utils/prisma";

export async function fetchPageById(pageId: number) {
	return await prisma.page.findUnique({
		where: { id: pageId },
	});
}

export async function getPageComments(pageId: number) {
	return await prisma.pageComment.findMany({
		where: {
			pageId,
		},
		include: {
			user: {
				select: {
					handle: true,
					name: true,
					image: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
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

export async function fetchFollowerList(userId: number) {
	const followers = await prisma.follow.findMany({
		where: {
			followingId: userId,
		},
		include: {
			follower: true,
		},
	});
	return followers;
}

export async function fetchFollowingList(userId: number) {
	const following = await prisma.follow.findMany({
		where: {
			followerId: userId,
		},
		include: {
			following: true,
		},
	});
	return following;
}
