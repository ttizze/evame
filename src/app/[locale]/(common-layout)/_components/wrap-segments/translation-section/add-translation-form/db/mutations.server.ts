import { db } from "@/db/kysely";

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
			point: 0,
		})
		.execute();
	return { success: true };
}
