import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/resend.server";

export const auth = betterAuth({
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, token, url }) => {
				await sendMagicLinkEmail(email, url, token);
			},
		}),
		customSession(async ({ session }) => {
			const currentUser = await prisma.user.findUnique({
				where: {
					id: session.userId,
				},
				include: {
					geminiApiKey: true,
				},
			});
			if (!currentUser) {
				throw new Error("User not found");
			}

			// Check if the user has a Gemini API key
			const hasGeminiApiKey = !!(
				currentUser.geminiApiKey && currentUser.geminiApiKey.apiKey !== ""
			);
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
					createdAt: currentUser.createdAt,
					updatedAt: currentUser.updatedAt,
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
	// データベース設定
	database: prismaAdapter(prisma, {
		provider: "postgresql",
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
