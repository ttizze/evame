import { prisma } from "@/lib/prisma";

export async function createFollow(followerId: string, followingId: string) {
	if (followerId === followingId) {
		throw new Error("Follower and following cannot be the same");
	}
	return await prisma.follow.create({
		data: {
			followerId,
			followingId,
		},
	});
}

export async function deleteFollow(followerId: string, followingId: string) {
	return await prisma.follow.delete({
		where: {
			followerId_followingId: {
				followerId,
				followingId,
			},
		},
	});
}
