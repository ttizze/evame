import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { customSession, magicLink } from "better-auth/plugins";
import { db } from "./db";
import { sendMagicLinkEmail } from "./utils/send-magic-link-email.server";

export const auth = betterAuth({
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, token, url }) => {
				await sendMagicLinkEmail(email, url, token);
			},
		}),
		customSession(async ({ session }) => {
			// ユーザー情報を取得（Kysely を使用）
			const currentUser = await db
				.selectFrom("users")
				.selectAll()
				.where("id", "=", session.userId)
				.executeTakeFirst();

			if (!currentUser) {
				throw new Error("User not found");
			}

			// Gemini APIキーを取得（Kysely を使用）
			const geminiApiKey = await db
				.selectFrom("geminiApiKeys")
				.selectAll()
				.where("userId", "=", session.userId)
				.executeTakeFirst();

			// Check if the user has a Gemini API key
			const hasGeminiApiKey = !!(geminiApiKey && geminiApiKey.apiKey !== "");
			return {
				user: {
					id: currentUser.id,
					name: currentUser.name,
					handle: currentUser.handle,
					plan: currentUser.plan,
					profile: currentUser.profile,
					twitterHandle: currentUser.twitterHandle,
					totalPoints: currentUser.totalPoints,
					isAi: currentUser.isAi,
					image: currentUser.image,
					createdAt: currentUser.createdAt,
					updatedAt: currentUser.updatedAt,
					hasGeminiApiKey,
				},
				session,
			};
		}),
	],
	// データベース設定（Kysely を直接使用）
	database: {
		db: db,
		type: "postgres",
	},
	user: {
		modelName: "users",
		additionalFields: {
			handle: {
				type: "string",
				required: true,
				defaultValue: () => createId(),
			},
		},
	},
	session: {
		modelName: "sessions",
		expiresIn: 60 * 60 * 24 * 7, // 7 days
	},
	account: {
		modelName: "accounts",
	},
	verification: {
		modelName: "verifications",
	},
	advanced: {
		database: {
			generateId: () => {
				return createId();
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
});
