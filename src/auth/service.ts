import { generateToken, hashToken } from "./crypto";
import { buildMagicLink, normalizeRedirectPath } from "./redirect";
import type { AuthStore } from "./store";

const DEFAULT_VERIFY_PATH = "/api/auth/verify";
const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1_000;
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 3;
const DEFAULT_USER_NAME = "Anonymous";

export class InvalidEmailError extends Error {
	readonly code = "invalid_email";

	constructor() {
		super("メールアドレスが不正です");
		this.name = "InvalidEmailError";
	}
}

export class InvalidMagicLinkError extends Error {
	readonly code = "invalid_magic_link";

	constructor() {
		super("ログインリンクが無効か期限切れです");
		this.name = "InvalidMagicLinkError";
	}
}

export class EmailDeliveryError extends Error {
	readonly code = "email_delivery_failed";

	constructor() {
		super("メール送信に失敗しました");
		this.name = "EmailDeliveryError";
	}
}

export type AuthServiceOptions = {
	store: AuthStore;
	publicOrigin: string;
	sendMagicLink(input: { email: string; link: string }): Promise<void>;
	verifyPath?: string;
	tokenTtlMs?: number;
	sessionTtlMs?: number;
	rateLimitWindowMs?: number;
	maxRequestsPerWindow?: number;
	userName?: string;
	now?: () => Date;
};

function normalizeEmail(value: string): string {
	const email = value.trim().toLowerCase();
	if (
		email.length === 0 ||
		email.length > 254 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)
	) {
		throw new InvalidEmailError();
	}
	return email;
}

function readNow(now: () => Date): Date {
	const value = now();
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new Error("現在時刻が不正です");
	}
	return new Date(value.getTime());
}

function assertPositiveFinite(value: number, name: string): number {
	if (!Number.isFinite(value) || value <= 0) {
		throw new RangeError(`${name}が不正です`);
	}
	return value;
}

export function createAuthService(options: AuthServiceOptions) {
	const publicOrigin = new URL(options.publicOrigin).origin;
	const verifyPath = options.verifyPath ?? DEFAULT_VERIFY_PATH;
	const tokenTtlMs = assertPositiveFinite(
		options.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS,
		"トークン有効期間",
	);
	const sessionTtlMs = assertPositiveFinite(
		options.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS,
		"セッション有効期間",
	);
	const rateLimitWindowMs = assertPositiveFinite(
		options.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
		"レート制限期間",
	);
	const maxRequestsPerWindow =
		options.maxRequestsPerWindow ?? DEFAULT_MAX_REQUESTS_PER_WINDOW;
	if (!Number.isInteger(maxRequestsPerWindow) || maxRequestsPerWindow < 1) {
		throw new RangeError("レート制限回数が不正です");
	}
	const now = options.now ?? (() => new Date());

	return {
		async requestMagicLink(input: {
			email: string;
			requestIp?: string;
			redirectTo?: string;
		}): Promise<{ accepted: true }> {
			const email = normalizeEmail(input.email);
			const current = readNow(now);
			const currentIso = current.toISOString();
			const requestIp = input.requestIp?.trim() || "unknown";
			const requestIpHash = await hashToken(requestIp);
			const since = new Date(
				current.getTime() - rateLimitWindowMs,
			).toISOString();
			const recentRequests = await options.store.countRecentMagicLinkRequests({
				email,
				request_ip_hash: requestIpHash,
				since,
			});

			// 制限超過時も「受理した」とだけ返し、登録有無を推測できないようにする。
			if (recentRequests >= maxRequestsPerWindow) {
				return { accepted: true };
			}

			const existingUser = await options.store.findUserByEmail(email);
			const user =
				existingUser ??
				(await options.store.createUser({
					id: generateToken(18),
					email,
					name: options.userName ?? DEFAULT_USER_NAME,
					created_at: currentIso,
				}));

			// 平文トークンはここで生成してリンクへ一度だけ埋め込み、DBにはハッシュのみ保存する。
			const token = generateToken();
			await options.store.insertMagicLinkToken({
				id: generateToken(18),
				email: user.email,
				token_hash: await hashToken(token),
				expires_at: new Date(current.getTime() + tokenTtlMs).toISOString(),
				used_at: null,
				created_at: currentIso,
				request_ip_hash: requestIpHash,
			});

			const link = buildMagicLink({
				origin: publicOrigin,
				verifyPath,
				token,
				redirectTo: input.redirectTo,
			});
			try {
				await options.sendMagicLink({ email: user.email, link });
			} catch {
				throw new EmailDeliveryError();
			}

			return { accepted: true };
		},

		async verifyMagicLink(input: {
			token: string;
			redirectTo?: string;
		}): Promise<{
			sessionToken: string;
			sessionExpiresAt: string;
			sessionMaxAgeSeconds: number;
			redirectPath: string;
		}> {
			if (!input.token || input.token.length > 512) {
				throw new InvalidMagicLinkError();
			}

			const current = readNow(now);
			const currentIso = current.toISOString();
			const tokenRecord = await options.store.consumeMagicLinkToken({
				token_hash: await hashToken(input.token),
				now: currentIso,
			});
			if (
				!tokenRecord ||
				Number.isNaN(Date.parse(tokenRecord.expires_at)) ||
				Date.parse(tokenRecord.expires_at) <= current.getTime()
			) {
				throw new InvalidMagicLinkError();
			}

			const user = await options.store.findUserByEmail(tokenRecord.email);
			if (!user) {
				throw new InvalidMagicLinkError();
			}

			const sessionToken = generateToken();
			const sessionExpiresAt = new Date(
				current.getTime() + sessionTtlMs,
			).toISOString();
			await options.store.insertSession({
				id: generateToken(18),
				user_id: user.id,
				token_hash: await hashToken(sessionToken),
				expires_at: sessionExpiresAt,
				created_at: currentIso,
			});

			return {
				sessionToken,
				sessionExpiresAt,
				sessionMaxAgeSeconds: Math.floor(sessionTtlMs / 1_000),
				redirectPath: normalizeRedirectPath(input.redirectTo, publicOrigin),
			};
		},

		async authenticateSession(sessionToken: string) {
			if (!sessionToken || sessionToken.length > 512) {
				return null;
			}

			const current = readNow(now);
			const currentIso = current.toISOString();
			const session = await options.store.findSessionByTokenHash({
				token_hash: await hashToken(sessionToken),
				now: currentIso,
			});
			const expiresAt = session ? Date.parse(session.expires_at) : Number.NaN;
			if (
				!session ||
				!Number.isFinite(expiresAt) ||
				expiresAt <= current.getTime()
			) {
				return null;
			}

			return options.store.findUserById(session.user_id);
		},

		async logout(sessionToken: string): Promise<void> {
			if (!sessionToken || sessionToken.length > 512) {
				return;
			}
			await options.store.deleteSessionByTokenHash(
				await hashToken(sessionToken),
			);
		},
	};
}

export type AuthService = ReturnType<typeof createAuthService>;
