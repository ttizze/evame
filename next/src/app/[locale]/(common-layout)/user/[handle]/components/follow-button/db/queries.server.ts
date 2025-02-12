import { prisma } from "@/lib/prisma";

export async function isFollowing(
	followerHandle: string,
	followingHandle: string,
) {
	const followingUser = await prisma.user.findUnique({
		where: {
			handle: followingHandle,
		},
	});
	const followerUser = await prisma.user.findUnique({
		where: {
			handle: followerHandle,
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
