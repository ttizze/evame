import type { TransactionClient } from "@/app/[locale]/_service/sync-segments";

export async function fetchCommentAcceptance(
	tx: TransactionClient,
	pageId: number,
) {
	return tx
		.selectFrom("pages")
		.select("commentsEnabled")
		.where("id", "=", pageId)
		.executeTakeFirst();
}
