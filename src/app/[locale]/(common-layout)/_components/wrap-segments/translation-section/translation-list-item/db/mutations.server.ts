import { db } from "@/db/kysely";

export const deleteOwnTranslation = async (
	currentHandle: string,
	translationId: number,
) => {
	const translation = await db
		.selectFrom("segmentTranslations")
		.innerJoin("users", "users.id", "segmentTranslations.userId")
		.select(["users.handle"])
		.where("segmentTranslations.id", "=", translationId)
		.executeTakeFirst();

	if (!translation) {
		return { error: "Translation not found" };
	}
	if (translation.handle !== currentHandle) {
		return { error: "Unauthorized" };
	}
	await db
		.deleteFrom("segmentTranslations")
		.where("id", "=", translationId)
		.execute();
};
