import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession, magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { sendMagicLinkEmail } from "@/lib/resend.server";
import { db } from "./drizzle";
import { geminiApiKeys, users } from "./drizzle/schema";

export const auth = betterAuth({
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, token, url }) => {
				await sendMagicLinkEmail(email, url, token);
			},
		}),
		customSession(async ({ session }) => {
			// ユーザー情報を取得
			const [currentUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, session.userId))
				.limit(1);

			if (!currentUser) {
				throw new Error("User not found");
			}

			// Gemini APIキーを取得
			const [geminiApiKey] = await db
				.select()
				.from(geminiApiKeys)
				.where(eq(geminiApiKeys.userId, session.userId))
				.limit(1);

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
					isAI: currentUser.isAI,
					image: currentUser.image,
					createdAt: new Date(currentUser.createdAt),
					updatedAt: new Date(currentUser.updatedAt),
					hasGeminiApiKey,
				},
				session,
			};
		}),
	],
	// セッション設定
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
	},
	// データベース設定
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
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
});
