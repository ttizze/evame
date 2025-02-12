import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
export const { handlers, auth, signIn, signOut } = NextAuth({
	providers: [
		Google({
			allowDangerousEmailAccountLinking: true,
		}),
		Resend({ from: "noreply@mail.reimei.dev" }),
	],
	adapter: PrismaAdapter(prisma),
	callbacks: {
		async session({ session, user }) {
			session.user.handle = user.handle;
			session.user.profile = user.profile;
			session.user.createdAt = user.createdAt;
			session.user.updatedAt = user.updatedAt;
			session.user.totalPoints = user.totalPoints;
			session.user.isAI = user.isAI;
			session.user.name = user.name ?? "";
			session.user.image = user.image ?? "";
			return session;
		},
	},
});

export async function getCurrentUser() {
	const session = await auth();
	return session?.user;
}
