import { db } from "@/drizzle";
import { segmentTranslations } from "@/drizzle/schema";

export async function addUserTranslation(
	segmentId: number,
	text: string,
	userId: string,
	locale: string,
) {
	await db.insert(segmentTranslations).values({
		segmentId,
		locale,
		text,
		userId,
	});
	return { success: true };
}
