import { neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { WebSocket } from "ws";
import * as schema from "../../drizzle/schema";

type DrizzleDb = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

declare global {
	var __drizzleDb: DrizzleDb | null;
}

function makeDb(): DrizzleDb {
	const connectionString = process.env.DATABASE_URL || "";
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isLocal = new URL(connectionString).hostname === "db.localtest.me";
	if (isLocal) {
		// ローカル環境ではpgクライアントを使用
		const pool = new Pool({ connectionString });
		return drizzlePg(pool, { schema });
	}

	// Neon serverless 環境
	neonConfig.webSocketConstructor = WebSocket;
	return drizzleNeon(connectionString, { schema });
}

// Proxyでラップすることで、テスト時にDATABASE_URLを切り替えても新しい接続が使われる
export const db = new Proxy({} as DrizzleDb, {
	get(_target, prop: string | symbol) {
		if (!globalThis.__drizzleDb) {
			globalThis.__drizzleDb = makeDb();
		}
		const value = globalThis.__drizzleDb[prop as keyof DrizzleDb];
		if (typeof value === "function") {
			return value.bind(globalThis.__drizzleDb);
		}
		return value;
	},
});
