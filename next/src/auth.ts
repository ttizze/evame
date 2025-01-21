import { PrismaAdapter } from "@auth/prisma-adapter";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const neon = new Pool({
	connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaNeon(neon);
//@ts-ignore
const prisma = new PrismaClient({ adapter });

export const { handlers, auth, signIn, signOut } = NextAuth({
	providers: [Google],
	adapter: PrismaAdapter(prisma),
});
