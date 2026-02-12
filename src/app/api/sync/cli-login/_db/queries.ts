import { db } from "@/db";

export async function findSessionTokenBySessionId(sessionId: string) {
	return await db
		.selectFrom("sessions")
		.select(["token", "expiresAt"])
		.where("id", "=", sessionId)
		.executeTakeFirst();
}
