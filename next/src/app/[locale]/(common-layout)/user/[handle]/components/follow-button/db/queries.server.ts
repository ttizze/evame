import { prisma } from "@/lib/prisma";

export async function isFollowing(followerId: string, followingId: string) {
	const followingUser = await prisma.user.findUnique({
		where: {
			id: followingId,
		},
	});
	const followerUser = await prisma.user.findUnique({
		where: {
			id: followerId,
		},
	});
	if (!followingUser || !followerUser) {
		return false;
	}
	const follow = await prisma.follow.findUnique({
		where: {
			followerId_followingId: {
				followerId: followerUser.id,
				followingId: followingUser.id,
			},
		},
	});
	return !!follow;
}
