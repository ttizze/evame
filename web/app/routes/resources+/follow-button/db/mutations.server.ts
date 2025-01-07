import { prisma } from "~/utils/prisma";

export async function createFollow(followerId: number, followingId: number) {
	return await prisma.follow.create({
		data: {
			followerId,
			followingId,
		},
	});
}

export async function deleteFollow(followerId: number, followingId: number) {
	return await prisma.follow.delete({
		where: {
			followerId_followingId: {
				followerId,
				followingId,
			},
		},
	});
}
