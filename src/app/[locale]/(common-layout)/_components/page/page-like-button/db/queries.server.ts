import { db } from "@/db/kysely";

export async function getPageLikeAndCount(
	pageId: number,
	currentUserId: string,
) {
	// Get like count
	const likeCountResult = await db
		.selectFrom("likePages")
		.select(({ fn }) => [fn.count<number>("id").as("count")])
		.where("pageId", "=", pageId)
		.executeTakeFirst();

	const likeCount = likeCountResult?.count ?? 0;

	// Check if current user has liked the page
	let liked = false;
	if (currentUserId) {
		const existingLike = await db
			.selectFrom("likePages")
			.selectAll()
			.where("pageId", "=", pageId)
			.where("userId", "=", currentUserId)
			.executeTakeFirst();
		liked = !!existingLike;
	}

	return { likeCount, liked };
}
