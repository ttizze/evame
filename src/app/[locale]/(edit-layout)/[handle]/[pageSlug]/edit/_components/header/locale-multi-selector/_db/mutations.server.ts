import { db } from "@/db";

export async function updateUserTargetLocales(
	userId: string,
	locales: string[],
) {
	const result = await db
		.insertInto("userSettings")
		.values({ userId, targetLocales: locales })
		.onConflict((oc) =>
			oc.column("userId").doUpdateSet({ targetLocales: locales }),
		)
		.returningAll()
		.executeTakeFirst();
	return result;
}
