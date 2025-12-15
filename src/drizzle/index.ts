import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { pool } from "@/db/pool";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzlePg<typeof schema>>;
type DrizzleDbWithPool = DrizzleDb & { pool: Pool };

declare global {
	var __drizzleDb: DrizzleDbWithPool | null;
}

export function makeDb(): DrizzleDbWithPool {
	// 共有の Pool インスタンスを使用
	const db = drizzlePg(pool, { schema });
	return Object.assign(db, { pool });
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
