import { db } from "@/db";

export async function findPersonalAccessTokenByHash(keyHash: string) {
	return await db
		.selectFrom("personalAccessTokens")
		.select(["id", "userId"])
		.where("keyHash", "=", keyHash)
		.executeTakeFirst();
}

export async function findSessionByToken(token: string) {
	return await db
		.selectFrom("sessions")
		.select(["userId", "expiresAt"])
		.where("token", "=", token)
		.executeTakeFirst();
}
