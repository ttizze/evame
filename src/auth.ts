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
			});
			if (!currentUser) {
				throw new Error("User not found");
			}
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
					// name が空なら自動生成
					if (!user.name?.trim()) {
						return {
							data: {
								...user,
								name: `new_user`, // 例: user_r4v5ts6k
							},
						};
					}
					return { data: user };
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
