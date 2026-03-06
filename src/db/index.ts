import { createRequire } from "node:module";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import type { DB } from "./types";

type PgPool = import("pg").Pool;
type PoolType = NeonPool | PgPool;
type KyselyDbWithPool = Kysely<DB> & { pool: PoolType };

declare global {
	var __kyselyDb: KyselyDbWithPool | null | undefined;
	var __kyselyDbConnectionString: string | null | undefined;
}

const pgModuleName = "pg";

function getConnectionString() {
	const connectionString =
		process.env.DATABASE_URL ||
		(process.env.NODE_ENV === "test"
			? "postgres://postgres:postgres@db.localtest.me:5435/main"
			: "");
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	return connectionString;
}

function createDb(connectionString: string): KyselyDbWithPool {
	const hostname = new URL(connectionString).hostname;
	const pool =
		hostname === "db.localtest.me" ||
		hostname === "localhost" ||
		hostname === "127.0.0.1"
			? new (
					createRequire(import.meta.url)(pgModuleName) as typeof import("pg")
				).Pool({
					connectionString,
					max: 20,
					idleTimeoutMillis: 30000,
					connectionTimeoutMillis: 30000,
				})
			: new NeonPool({ connectionString });

	const db = new Kysely<DB>({
		dialect: new PostgresDialect({ pool }),
		plugins: [new CamelCasePlugin()],
	});

	return Object.assign(db, { pool });
}

function getDb(): KyselyDbWithPool {
	const connectionString = getConnectionString();

	if (
		!globalThis.__kyselyDb ||
		globalThis.__kyselyDbConnectionString !== connectionString
	) {
		globalThis.__kyselyDb = createDb(connectionString);
		globalThis.__kyselyDbConnectionString = connectionString;
	}

	return globalThis.__kyselyDb;
}

export const db = new Proxy({} as KyselyDbWithPool, {
	get(_target, prop, receiver) {
		const instance = getDb();
		const value = Reflect.get(instance, prop, receiver);
		if (typeof value === "function") {
			return value.bind(instance);
		}
		return value;
	},
});

export async function disposeDb(): Promise<void> {
	if (!globalThis.__kyselyDb) {
		return;
	}

	if (typeof globalThis.__kyselyDb.destroy === "function") {
		await globalThis.__kyselyDb.destroy();
	}

	globalThis.__kyselyDb = null;
	globalThis.__kyselyDbConnectionString = null;
}
