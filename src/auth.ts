import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/resend.server";
import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { customSession, magicLink } from "better-auth/plugins";
import { kyselyAdapter } from "../node_modules/better-auth/dist/adapters/kysely-adapter/index.mjs";

export const auth = betterAuth({
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, token, url }) => {
				await sendMagicLinkEmail(email, url, token);
			},
		}),
		customSession(async ({ session }) => {
			const currentUser = await db
				.selectFrom("users")
				.leftJoin("gemini_api_keys", "users.id", "gemini_api_keys.user_id")
				.select([
					"users.id",
					"users.name",
					"users.handle",
					"users.plan",
					"users.profile",
					"users.twitterHandle",
					"users.total_points",
					"users.is_ai",
					"users.image",
					"users.created_at",
					"users.updated_at",
					"gemini_api_keys.api_key",
				])
				.where("users.id", "=", session.userId)
				.executeTakeFirst();
			if (!currentUser) {
				throw new Error("User not found");
			}

			// Check if the user has a Gemini API key
			const hasGeminiApiKey = !!(
				currentUser.api_key && currentUser.api_key !== ""
			);
			return {
				user: {
					id: currentUser.id,
					name: currentUser.name,
					handle: currentUser.handle,
					plan: currentUser.plan,
					profile: currentUser.profile,
					twitterHandle: currentUser.twitterHandle,
					totalPoints: currentUser.total_points,
					isAI: currentUser.is_ai,
					image: currentUser.image,
					createdAt: currentUser.created_at,
					updatedAt: currentUser.updated_at,
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
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		expiresIn: 60 * 60 * 24 * 7, // 7 days
	},
	account: {
		fields: {
			accountId: "providerAccountId",
			providerId: "provider",
			accessToken: "access_token",
			refreshToken: "refresh_token",
			idToken: "id_token",
			accessTokenExpiresAt: "expires_at",
			refreshTokenExpiresAt: "refreshTokenExpiresAt",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	// データベース設定
	database: kyselyAdapter(db, {
		type: "postgres",
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
