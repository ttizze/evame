import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { hashPersonalAccessToken } from "@/app/api/_service/authenticate-token";
import {
	deleteDeviceToken,
	deleteLoginCode,
	insertDeviceToken,
} from "./_db/mutations";

const tokenInput = z.object({
	code: z.string().min(1),
	code_verifier: z.string().min(43).max(128),
});

/**
 * ログインで受け取ったコードとPKCEの元の乱数を、端末用トークンへ交換する。
 * コードは照合の成否にかかわらず一度で使えなくする。
 */
export async function postAppToken(request: Request): Promise<Response> {
	const parsed = tokenInput.safeParse(await request.json().catch(() => null));
	if (!parsed.success)
		return Response.json({ error: "Invalid request" }, { status: 400 });

	const row = await deleteLoginCode(parsed.data.code);
	const login = row
		? (JSON.parse(row.value) as { userId: string; challenge: string })
		: null;
	const challenge = createHash("sha256")
		.update(parsed.data.code_verifier)
		.digest("base64url");
	if (
		!row ||
		!login ||
		row.expiresAt <= new Date() ||
		login.challenge !== challenge
	)
		return Response.json({ error: "Invalid code" }, { status: 400 });

	const token = `evame_${randomBytes(24).toString("hex")}`;
	await insertDeviceToken({
		userId: login.userId,
		keyHash: hashPersonalAccessToken(token),
	});
	return Response.json({ token });
}

/** ログアウト。要求に使った端末用トークンだけを失効させる。 */
export async function deleteAppToken(request: Request): Promise<Response> {
	const token = (request.headers.get("authorization") ?? "")
		.replace(/^Bearer\s+/i, "")
		.trim();
	if (!token || (await deleteDeviceToken(hashPersonalAccessToken(token))) === 0)
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	return new Response(null, { status: 204 });
}
