import { prisma } from "@/lib/prisma";

export async function getPageLikeAndCount(
	pageId: number,
	currentUserId: string,
) {
	// Get like count
	const likeCount = await prisma.likePage.count({
		where: { pageId },
	});

	// Check if current user has liked the
	let liked = false;
	if (currentUserId) {
		const existingLike = await prisma.likePage.findFirst({
			where: {
				pageId,
				userId: currentUserId,
			},
		});
		liked = !!existingLike;
	}

	return { likeCount, liked };
}
