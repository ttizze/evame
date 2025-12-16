import { db } from "@/drizzle";
import { userSettings } from "@/drizzle/schema";

export async function updateUserTargetLocales(
	userId: string,
	locales: string[],
) {
	const [result] = await db
		.insert(userSettings)
		.values({ userId, targetLocales: locales })
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: { targetLocales: locales },
		})
		.returning();
	return result;
}
