import { createHash } from "node:crypto";
import { touchPersonalAccessTokenLastUsed } from "./_db/mutations";
import {
	findPersonalAccessTokenByHash,
	findSessionByToken,
} from "./_db/queries";

/**
 * Bearerトークン認証
 * - CLIログイン: sessions.token を検証
 * - GitHub Actions: PAT を SHA256 で personal_access_tokens.key_hash に照合
 */
export async function authenticateToken(
	request: Request,
): Promise<{ userId: string } | null> {
	const authHeader = request.headers.get("authorization");
	if (!authHeader) return null;

	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) return null;

	const token = match[1].trim();
	if (!token) return null;

	// PATは evame_ prefix を持つため先に照合する
	if (token.startsWith("evame_")) {
		const patUser = await authenticatePat(token);
		if (patUser) return patUser;
	}

	const sessionUser = await authenticateSessionToken(token);
	if (sessionUser) return sessionUser;

	return null;
}

/** PATはハッシュだけを保存する。発行・照合・失効で同じ計算にするため1か所に置く。 */
export function hashPersonalAccessToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

async function authenticatePat(
	token: string,
): Promise<{ userId: string } | null> {
	const personalAccessToken = await findPersonalAccessTokenByHash(
		hashPersonalAccessToken(token),
	);

	if (!personalAccessToken) return null;

	touchPersonalAccessTokenLastUsed(personalAccessToken.id).catch(() => {});

	return { userId: personalAccessToken.userId };
}

async function authenticateSessionToken(
	token: string,
): Promise<{ userId: string } | null> {
	const now = new Date();
	const session = await findSessionByToken(token);

	if (!session) return null;
	if (session.expiresAt <= now) return null;

	return { userId: session.userId };
}
