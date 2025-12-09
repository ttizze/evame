import { db } from "@/db/kysely";

export async function togglePageLike(pageId: number, currentUserId: string) {
	const page = await db
		.selectFrom("pages")
		.selectAll()
		.where("id", "=", pageId)
		.executeTakeFirst();

	if (!page) {
		throw new Error("Page not found");
	}

	const existing = await db
		.selectFrom("likePages")
		.selectAll()
		.where("pageId", "=", page.id)
		.where("userId", "=", currentUserId)
		.executeTakeFirst();

	let liked: boolean;
	if (existing) {
		await db.deleteFrom("likePages").where("id", "=", existing.id).execute();
		liked = false;
	} else {
		await db
			.insertInto("likePages")
			.values({
				pageId: page.id,
				userId: currentUserId,
			})
			.execute();
		await createPageLikeNotification({
			pageId: page.id,
			targetUserId: page.userId,
			actorId: currentUserId,
		});
		liked = true;
	}

	// 更新後の最新のいいね数を取得する
	const likeCountResult = await db
		.selectFrom("likePages")
		.select(({ fn }) => [fn.count<number>("id").as("count")])
		.where("pageId", "=", page.id)
		.executeTakeFirst();

	const likeCount = likeCountResult?.count ?? 0;

	return { liked, likeCount };
}

async function createPageLikeNotification({
	pageId,
	targetUserId,
	actorId,
}: {
	pageId: number;
	targetUserId: string;
	actorId: string;
}) {
	await db
		.insertInto("notifications")
		.values({
			pageId,
			userId: targetUserId,
			actorId,
			type: "PAGE_LIKE",
		})
		.execute();
}
