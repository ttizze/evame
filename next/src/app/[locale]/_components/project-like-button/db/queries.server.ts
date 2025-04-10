import { prisma } from "@/lib/prisma";

export async function getProjectLikeAndCount(
	projectId: string,
	currentUserId: string,
) {
	// Get like count
	const likeCount = await prisma.projectLike.count({
		where: { projectId },
	});

	// Check if current user has liked the project
	let liked = false;
	if (currentUserId) {
		const existingLike = await prisma.projectLike.findFirst({
			where: {
				projectId,
				userId: currentUserId,
			},
		});
		liked = !!existingLike;
	}

	return { likeCount, liked };
}
