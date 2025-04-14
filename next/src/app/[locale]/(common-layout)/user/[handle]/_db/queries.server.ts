import { prisma } from "@/lib/prisma";
import { sanitizeUser } from "@/lib/sanitize-user";

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

export async function fetchUserProjectsWithPagination(
	userId: string,
	page = 1,
	pageSize = 10,
	searchTerm = "",
	sort = "popular",
) {
	const skip = (page - 1) * pageSize;
	const whereClause = {
		userId,
		OR: [
			{
				title: {
					contains: searchTerm,
					mode: "insensitive" as const,
				},
			},
			{
				description: {
					contains: searchTerm,
					mode: "insensitive" as const,
				},
			},
		],
	};

	// Define sort order based on sort parameter
	const orderBy =
		sort === "new"
			? { createdAt: "desc" as const }
			: { updatedAt: "desc" as const };

	const [projectsWithRelations, totalCount] = await Promise.all([
		prisma.project.findMany({
			where: whereClause,
			orderBy,
			skip,
			take: pageSize,
			include: {
				user: true,
				images: true,
				links: true,
				projectTagRelations: { include: { projectTag: true } },
			},
		}),
		prisma.project.count({
			where: whereClause,
		}),
	]);

	return {
		projectsWithRelations,
		totalPages: Math.ceil(totalCount / pageSize),
		currentPage: page,
	};
}
