import { db } from "@/db";

export async function hasSegmentsForContentId(
	contentId: number,
): Promise<boolean> {
	const result = await db
		.selectFrom("segments")
		.select("id")
		.where("contentId", "=", contentId)
		.limit(1)
		.executeTakeFirst();

	return !!result;
}
