// db.ts

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";

declare global {
	var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL || "";
if (!connectionString) {
	throw new Error("DATABASE_URL is not defined");
}
const isLocal = new URL(connectionString).hostname === "db.localtest.me";

// Production（Neon本番）のみアダプタを使う
function makeClient() {
	if (isLocal) {
		return new PrismaClient(); // TCP直
	}
	// Neon serverless を使う環境だけ設定
	neonConfig.webSocketConstructor = WebSocket;
	const adapter = new PrismaNeon({ connectionString });
	return new PrismaClient({ adapter });
}

const prismaClient = globalThis.prisma ?? makeClient();
globalThis.prisma = prismaClient;
export { prismaClient as prisma };
