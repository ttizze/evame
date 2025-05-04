import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";

export async function getFollowCounts(userId: string) {
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

export async function fetchFollowerList(userId: string) {
	const followers = await prisma.follow.findMany({
		where: {
			followingId: userId,
		},
		include: {
			follower: true,
		},
	});
	return followers.map((record) => ({
		...record,
		follower: sanitizeUser(record.follower),
	}));
}

export async function fetchFollowingList(userId: string) {
	const following = await prisma.follow.findMany({
		where: {
			followerId: userId,
		},
		include: {
			following: true,
		},
	});
	return following.map((record) => ({
		...record,
		following: sanitizeUser(record.following),
	}));
}
