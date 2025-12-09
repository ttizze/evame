import { db, dialect } from "@/db/kysely";
import { sendMagicLinkEmail } from "@/lib/resend.server";
import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { customSession, magicLink } from "better-auth/plugins";

export const auth = betterAuth({
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, token, url }) => {
				await sendMagicLinkEmail(email, url, token);
			},
		}),
		customSession(async ({ session }) => {
			// Kysely でユーザー情報と Gemini API キーを取得
			const result = await db
				.selectFrom("users")
				.leftJoin("geminiApiKeys", "geminiApiKeys.userId", "users.id")
				.select([
					"users.id",
					"users.name",
					"users.handle",
					"users.plan",
					"users.profile",
					"users.twitterHandle",
					"users.totalPoints",
					"users.isAi",
					"users.image",
					"users.createdAt",
					"users.updatedAt",
					"geminiApiKeys.apiKey",
				])
				.where("users.id", "=", session.userId)
				.executeTakeFirst();

			if (!result) {
				throw new Error("User not found");
			}

			// Check if the user has a Gemini API key
			const hasGeminiApiKey = !!(result.apiKey && result.apiKey !== "");

			return {
				user: {
					id: result.id,
					name: result.name,
					handle: result.handle,
					plan: result.plan,
					profile: result.profile,
					twitterHandle: result.twitterHandle,
					totalPoints: result.totalPoints,
					isAI: Boolean(result.isAi),
					image: result.image,
					createdAt: result.createdAt,
					updatedAt: result.updatedAt,
					hasGeminiApiKey,
				},
				session,
			};
		}),
	],
	// セッション設定
	session: {
		fields: {
			expiresAt: "expires",
			token: "sessionToken",
		},
		expiresIn: 60 * 60 * 24 * 7, // 7 days
	},
	// データベース設定: Kysely接続（Turso/SQLite両対応）
	database: {
		dialect,
		type: "sqlite",
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const handle = createId();
					const name =
						typeof user.name === "string" && user.name.trim()
							? user.name
							: "new_user";
					return {
						data: {
							...user,
							handle,
							name,
						},
					};
				},
			},
		},
	},
	// ソーシャルプロバイダー設定
	socialProviders: {
		google: {
			clientId: process.env.AUTH_GOOGLE_ID as string,
			clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
		},
	},
	advanced: {
		database: {
			generateId: (options) => {
				if (
					options.model === "user" ||
					options.model === "accounts" ||
					options.model === "sessions" ||
					options.model === "verification" ||
					options.model === "verification_tokens"
				) {
					return false;
				}
				return crypto.randomUUID();
			},
		},
	},
});
