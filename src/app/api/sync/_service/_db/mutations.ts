import { db } from "@/db";

export async function touchPersonalAccessTokenLastUsed(id: number) {
	await db
		.updateTable("personalAccessTokens")
		.set({ lastUsedAt: new Date() })
		.where("id", "=", id)
		.execute();
}
