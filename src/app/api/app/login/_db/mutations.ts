import { db } from "@/db";

export async function insertLoginCode(code: {
	code: string;
	userId: string;
	challenge: string;
	expiresAt: Date;
}) {
	// 交換されなかったコードを、新しいコードの発行のついでに消す。
	await db
		.deleteFrom("verifications")
		.where("identifier", "like", "app-login:%")
		.where("expiresAt", "<=", new Date())
		.execute();
	await db
		.insertInto("verifications")
		.values({
			id: crypto.randomUUID(),
			identifier: `app-login:${code.code}`,
			value: JSON.stringify({ userId: code.userId, challenge: code.challenge }),
			expiresAt: code.expiresAt,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.execute();
}
