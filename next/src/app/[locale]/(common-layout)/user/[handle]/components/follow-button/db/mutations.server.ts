import { prisma } from "@/lib/prisma";

export async function createFollow(
	followerHandle: string,
	followingHandle: string,
) {
	if (followerHandle === followingHandle) {
		throw new Error("Follower and following cannot be the same");
	}
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
	if (!followerUser || !followingUser) {
		throw new Error("User not found");
	}
	return await prisma.follow.create({
		data: {
			followerId: followerUser.id,
			followingId: followingUser.id,
		},
	});
}

export async function deleteFollow(
	followerHandle: string,
	followingHandle: string,
) {
	const followerUser = await prisma.user.findUnique({
		where: {
			handle: followerHandle,
		},
	});
	const followingUser = await prisma.user.findUnique({
		where: {
			handle: followingHandle,
		},
	});
	if (!followerUser || !followingUser) {
		throw new Error("User not found");
	}
	return await prisma.follow.delete({
		where: {
			followerId_followingId: {
				followerId: followerUser.id,
				followingId: followingUser.id,
			},
		},
	});
}
