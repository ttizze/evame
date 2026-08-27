import type { Logger } from "@better-auth/core/env";
import { betterAuth } from "better-auth/minimal";
import { customSession, magicLink } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { TursoDatabase } from "@/db/turso-types";
import { createTursoAdapter } from "./adapter";
import { hashToken } from "./crypto";
import { sendMagicLinkEmail } from "./email";

const MAGIC_LINK_TTL_SECONDS = 15 * 60;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_AVATAR_URL = "https://evame.tech/avatar.png";

const SAFE_AUTH_LOGGER: Logger = {
	level: "warn",
	disableColors: true,
	log(level) {
		if (level === "error") console.error("auth.error");
		else console.warn("auth.warning");
	},
};

export type AuthRuntimeConfig = {
	database: TursoDatabase;
	baseURL: string;
	secret: string;
	google: {
		clientId: string;
		clientSecret: string;
	};
	resend?: {
		apiKey: string;
		from: string;
	};
	fetchImpl?: typeof fetch;
};

function normalizeBaseURL(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("認証のベースURLが不正です");
	}
	if (
		(url.protocol !== "https:" && url.protocol !== "http:") ||
		url.username ||
		url.password
	) {
		throw new Error("認証のベースURLが不正です");
	}
	return url.toString().replace(/\/$/u, "");
}

function validateRuntimeConfig(config: AuthRuntimeConfig): string {
	if (!config.database) throw new Error("認証データベースが設定されていません");
	if (typeof config.secret !== "string" || config.secret.length === 0) {
		throw new Error("認証シークレットが設定されていません");
	}
	if (
		!config.google ||
		typeof config.google.clientId !== "string" ||
		config.google.clientId.length === 0 ||
		typeof config.google.clientSecret !== "string" ||
		config.google.clientSecret.length === 0
	) {
		throw new Error("Google認証の設定が不完全です");
	}
	return normalizeBaseURL(config.baseURL);
}

/**
 * Better Auth の実行時設定を注入する。
 * DB接続とWorker secretsをモジュール評価時に読まないため、各Worker環境で生成する。
 */
export function createAuth(config: AuthRuntimeConfig) {
	const baseURL = validateRuntimeConfig(config);
	const resend = config.resend;
	const socialProviders = {
		google: {
			clientId: config.google.clientId,
			clientSecret: config.google.clientSecret,
		},
	};

	return betterAuth({
		appName: "Digital Buddhism",
		baseURL,
		secret: config.secret,
		basePath: "/api/auth",
		database: createTursoAdapter(config.database),
		trustedOrigins: [new URL(baseURL).origin],
		logger: SAFE_AUTH_LOGGER,
		socialProviders,
		rateLimit: {
			enabled: true,
			storage: "memory",
		},
		plugins: [
			magicLink({
				expiresIn: MAGIC_LINK_TTL_SECONDS,
				allowedAttempts: 1,
				rateLimit: { window: MAGIC_LINK_TTL_SECONDS, max: 3 },
				storeToken: {
					type: "custom-hasher",
					hash: hashToken,
				},
				sendMagicLink: async ({ email, url }) => {
					if (!resend) throw new Error("メール送信が設定されていません");
					await sendMagicLinkEmail({
						apiKey: resend.apiKey,
						from: resend.from,
						email,
						link: url,
						fetchImpl: config.fetchImpl,
					});
				},
			}),
			customSession(async ({ user, session }) => {
				const key = await config.database.get<{ api_key: string }>(
					"SELECT api_key FROM gemini_api_keys WHERE user_id = ? LIMIT 1",
					[session.userId],
				);
				return {
					user: {
						...user,
						hasGeminiApiKey: Boolean(key?.api_key),
					},
					session,
				};
			}),
			tanstackStartCookies(),
		],
		user: {
			modelName: "users",
			fields: {
				emailVerified: "email_verified",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			additionalFields: {
				handle: {
					type: "string",
					required: true,
					defaultValue: () => crypto.randomUUID(),
					fieldName: "handle",
					unique: true,
				},
				profile: {
					type: "string",
					required: true,
					defaultValue: "",
					fieldName: "profile",
				},
				totalPoints: {
					type: "number",
					required: true,
					defaultValue: 0,
					fieldName: "total_points",
				},
				isAi: {
					type: "boolean",
					required: true,
					defaultValue: false,
					fieldName: "is_ai",
				},
				plan: {
					type: "string",
					required: true,
					defaultValue: "free",
					fieldName: "plan",
				},
				twitterHandle: {
					type: "string",
					required: true,
					defaultValue: "",
					fieldName: "twitter_handle",
				},
				provider: {
					type: "string",
					required: true,
					defaultValue: "Credentials",
					fieldName: "provider",
				},
			},
			customSyntheticUser: ({
				coreFields,
				additionalFields,
				id,
			}: {
				coreFields: {
					name: string;
					email: string;
					emailVerified: boolean;
					image: string | null;
					createdAt: Date;
					updatedAt: Date;
				};
				additionalFields: Record<string, unknown>;
				id: string;
			}) => ({
				...coreFields,
				image: coreFields.image ?? DEFAULT_AVATAR_URL,
				...additionalFields,
				id,
			}),
		},
		session: {
			modelName: "sessions",
			expiresIn: SESSION_TTL_SECONDS,
			fields: {
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
				userId: "user_id",
				ipAddress: "ip_address",
				userAgent: "user_agent",
			},
		},
		account: {
			modelName: "accounts",
			fields: {
				providerId: "provider_id",
				accountId: "account_id",
				userId: "user_id",
				accessToken: "access_token",
				refreshToken: "refresh_token",
				idToken: "id_token",
				accessTokenExpiresAt: "access_token_expires_at",
				refreshTokenExpiresAt: "refresh_token_expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		verification: {
			modelName: "verifications",
			fields: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				expiresAt: "expires_at",
			},
		},
		advanced: {
			useSecureCookies: false,
			cookies: {
				session_token: {
					name: "digital_buddhism_session",
					attributes: {
						secure: true,
						httpOnly: true,
						sameSite: "lax",
						path: "/",
					},
				},
			},
			database: {
				generateId: () => crypto.randomUUID(),
			},
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;

export { DEFAULT_AVATAR_URL, MAGIC_LINK_TTL_SECONDS, SESSION_TTL_SECONDS };
