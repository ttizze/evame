import { neonConfig } from "@neondatabase/serverless";
import { Pool } from "pg";
import { WebSocket } from "ws";

const connectionString = process.env.DATABASE_URL || "";
if (!connectionString) {
	throw new Error("DATABASE_URL is not defined");
}

const isLocal = new URL(connectionString).hostname === "db.localtest.me";

// Neon serverless 環境の場合は WebSocket を設定
if (!isLocal) {
	neonConfig.webSocketConstructor = WebSocket;
}

// グローバルな Pool インスタンスを保持
declare global {
	var __dbPool: Pool | undefined;
}

// Next.js の開発モードでホットリロードが発生しても、既存の Pool を再利用
if (!globalThis.__dbPool) {
	globalThis.__dbPool = new Pool({
		connectionString,
		// ローカル環境用に接続プールのサイズを調整
		max: isLocal ? 10 : 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	});
}

export const pool = globalThis.__dbPool;
