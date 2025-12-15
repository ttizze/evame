import { neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { WebSocket } from "ws";
import * as schema from "./schema";

type DrizzleDb =
	| ReturnType<typeof drizzleNeon<typeof schema>>
	| ReturnType<typeof drizzlePg<typeof schema>>;

type DrizzleDbWithPool = DrizzleDb & { pool?: Pool };

declare global {
	var __drizzleDb: DrizzleDbWithPool | null;
}

export function makeDb(): DrizzleDbWithPool {
	const connectionString = process.env.DATABASE_URL || "";
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isLocal = new URL(connectionString).hostname === "db.localtest.me";
	if (isLocal) {
		// ローカル環境ではpgクライアントを使用
		const pool = new Pool({
			connectionString,
			idleTimeoutMillis: 0,
			connectionTimeoutMillis: 0,
		});
		const db = drizzlePg(pool, { schema });
		return Object.assign(db, { pool });
	}

	// Neon serverless 環境
	neonConfig.webSocketConstructor = WebSocket;
	return drizzleNeon(connectionString, { schema });
}

function getOrCreateDb(): DrizzleDbWithPool {
	if (!globalThis.__drizzleDb) {
		globalThis.__drizzleDb = makeDb();
	}
	return globalThis.__drizzleDb;
}

// 通常はシングルトン、テスト時はresetAllClients()で切断してから再取得
export let db: DrizzleDbWithPool = getOrCreateDb();

// テスト用：接続を再作成（DATABASE_URL変更後に呼ぶ）
export function refreshDb(): void {
	globalThis.__drizzleDb = null;
	db = getOrCreateDb();
}
