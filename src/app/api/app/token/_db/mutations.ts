import { db } from "@/db";

/** 一回限りのログインコードを消し、消した行を返す。見つからなければundefined。 */
export async function deleteLoginCode(code: string) {
	return await db
		.deleteFrom("verifications")
		.where("identifier", "=", `app-login:${code}`)
		.returning(["value", "expiresAt"])
		.executeTakeFirst();
}

export async function insertDeviceToken(token: {
	userId: string;
	keyHash: string;
}) {
	await db
		.insertInto("personalAccessTokens")
		.values({ userId: token.userId, keyHash: token.keyHash, name: "iPhone" })
		.execute();
}

/** トークンを失効させ、消した件数を返す。 */
export async function deleteDeviceToken(keyHash: string) {
	const result = await db
		.deleteFrom("personalAccessTokens")
		.where("keyHash", "=", keyHash)
		.executeTakeFirst();
	return Number(result.numDeletedRows);
}
