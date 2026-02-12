import { db } from "@/db";

export async function findTitleSegmentText(contentId: number) {
	const segment = await db
		.selectFrom("segments")
		.select("text")
		.where("contentId", "=", contentId)
		.where("number", "=", 0)
		.executeTakeFirst();

	return segment?.text;
}
