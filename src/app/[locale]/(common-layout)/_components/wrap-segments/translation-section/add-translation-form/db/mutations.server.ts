import { db } from "@/db";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
) {
	await db
		.insertInto("segmentTranslations")
		.values({
			segmentId,
			locale,
			text,
			userId,
		})
		.execute();
	return { success: true };
}
