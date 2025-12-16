import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { WebSocket } from "ws";

declare global {
	var __prismaClient: PrismaClient | null;
}

function makeClient(): PrismaClient {
	const connectionString = process.env.DATABASE_URL || "";
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isLocal = new URL(connectionString).hostname === "db.localtest.me";
	if (isLocal) {
		return new PrismaClient();
	}

	// Neon serverless 環境のみアダプタを使用
	neonConfig.webSocketConstructor = WebSocket;
	return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

// Proxyでラップすることで、テスト時にDATABASE_URLを切り替えても新しい接続が使われる
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
	get(_target, prop: string | symbol) {
		if (!globalThis.__prismaClient) {
			globalThis.__prismaClient = makeClient();
		}
		const value = globalThis.__prismaClient[prop as keyof PrismaClient];
		if (typeof value === "function") {
			return value.bind(globalThis.__prismaClient);
		}
		return value;
	},
});
