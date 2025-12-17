import { Pool as NeonPool } from "@neondatabase/serverless";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Pool as PgPool } from "pg";
import type { DB } from "./types";

type PoolType = NeonPool | PgPool;
type KyselyDbWithPool = Kysely<DB> & { pool: PoolType };

declare global {
	var __kyselyDb: KyselyDbWithPool | null;
}

function createDb(): KyselyDbWithPool {
	const connectionString =
		process.env.DATABASE_URL ||
		(process.env.NODE_ENV === "test"
			? "postgres://postgres:postgres@db.localtest.me:5435/main"
			: "");
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const isLocal = new URL(connectionString).hostname === "db.localtest.me";
	let pool: PoolType;
	if (isLocal) {
		pool = new PgPool({ connectionString });
	} else {
		pool = new NeonPool({ connectionString });
	}

	const db = new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
		plugins: [new CamelCasePlugin()],
	});

	return Object.assign(db, { pool });
}

if (!globalThis.__kyselyDb) {
	globalThis.__kyselyDb = createDb();
}
export let db: KyselyDbWithPool = globalThis.__kyselyDb;

export async function disposeDb(): Promise<void> {
	if (globalThis.__kyselyDb) {
		if (typeof globalThis.__kyselyDb.destroy === "function") {
			await globalThis.__kyselyDb.destroy();
		}
	}
	globalThis.__kyselyDb = null;
	db = globalThis.__kyselyDb = createDb();
}
