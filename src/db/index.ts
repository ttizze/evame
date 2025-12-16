import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Pool as PgPool } from "pg";
import { WebSocket } from "ws";
import type { DB } from "./types";

type PoolType = NeonPool | PgPool;
type KyselyDbWithPool = Kysely<DB> & { pool: PoolType };

declare global {
	var __kyselyDb: KyselyDbWithPool | null;
}

function makeDb(): KyselyDbWithPool {
	const connectionString = process.env.DATABASE_URL || "";
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isLocal = new URL(connectionString).hostname === "db.localtest.me";

	let pool: PoolType;
	if (isLocal) {
		pool = new PgPool({
			connectionString,
		});
	} else {
		neonConfig.webSocketConstructor = WebSocket;
		pool = new NeonPool({
			connectionString,
		});
	}

	const db = new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
		plugins: [new CamelCasePlugin()],
	});

	return Object.assign(db, { pool });
}

// Proxy で遅延初期化（Drizzle と同じパターン）
export const db = new Proxy({} as Kysely<DB>, {
	get(_target, prop: string | symbol) {
		if (!globalThis.__kyselyDb) {
			globalThis.__kyselyDb = makeDb();
		}
		const value = globalThis.__kyselyDb[prop as keyof Kysely<DB>];
		if (typeof value === "function") {
			return value.bind(globalThis.__kyselyDb);
		}
		return value;
	},
});
