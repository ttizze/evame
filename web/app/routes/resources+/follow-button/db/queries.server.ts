import { prisma } from "~/utils/prisma";

export async function isFollowing(followerId: number, followingId: number) {
	const follow = await prisma.follow.findUnique({
		where: {
			followerId_followingId: {
				followerId,
				followingId,
			},
		},
	});
	return !!follow;
}
