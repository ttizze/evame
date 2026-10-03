import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { customSession, magicLink } from "better-auth/plugins";
import { databaseScope, db } from "./db";
import { sendMagicLinkEmail } from "./utils/send-magic-link-email.server";

function createAuth(database: typeof db) {
	return betterAuth({
		plugins: [
			magicLink({
				sendMagicLink: async ({ email, token, url }) => {
					await sendMagicLinkEmail(email, url, token);
				},
			}),
			customSession(async ({ session }) => {
				const [currentUser, geminiApiKey] = await Promise.all([
					database
						.selectFrom("users")
						.selectAll()
						.where("id", "=", session.userId)
						.executeTakeFirst(),
					database
						.selectFrom("geminiApiKeys")
						.selectAll()
						.where("userId", "=", session.userId)
						.executeTakeFirst(),
				]);

				if (!currentUser) {
					throw new Error("User not found");
				}

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
			db: database,
			type: "postgres",
		},
		user: {
			modelName: "users",
			additionalFields: {
				handle: {
					type: "string",
					required: true,
					defaultValue: createId,
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
				generateId: createId,
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
}

const authentications = new WeakMap<typeof db, ReturnType<typeof createAuth>>();
export function getAuth() {
	const database = databaseScope.getStore() ?? db;
	let authentication = authentications.get(database);
	if (!authentication) {
		authentication = createAuth(database);
		authentications.set(database, authentication);
	}
	return authentication;
}
