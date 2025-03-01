import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
	providers: [
		Google({
			allowDangerousEmailAccountLinking: true,
		}),
		Resend({ from: "noreply@mail.reimei.dev" }),
	],
	adapter: PrismaAdapter(prisma),
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			if (trigger === "update") {
				token.handle = session.user.handle;
				token.name = session.user.name;
				token.profile = session.user.profile;
				token.twitterHandle = session.user.twitterHandle;
			}
			if (user) {
				token.id = user.id;
				token.handle = user.handle;
				token.profile = user.profile;
				token.twitterHandle = user.twitterHandle;
				token.createdAt = user.createdAt;
				token.updatedAt = user.updatedAt;
				token.totalPoints = user.totalPoints;
				token.isAI = user.isAI;
				token.name = user.name;
				token.image = user.image;
			}
			return token;
		},
		async session({ session, token }) {
			session.user.id = token.id as string;
			session.user.handle = token.handle as string;
			session.user.profile = token.profile as string;
			session.user.twitterHandle = token.twitterHandle as string;
			session.user.createdAt = token.createdAt as Date;
			session.user.updatedAt = token.updatedAt as Date;
			session.user.totalPoints = token.totalPoints as number;
			session.user.isAI = token.isAI as boolean;
			session.user.name = token.name as string;
			session.user.image = token.image as string;
			return session;
		},
	},
});

export async function getCurrentUser() {
	const session = await auth();
	return session?.user;
}
