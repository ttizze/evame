import { AsyncLocalStorage } from "node:async_hooks";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Client as PgClient, Pool as PgPool } from "pg";
import type { DB } from "./types";

type PoolType = NeonPool | PgPool;
type KyselyDbWithPool = Kysely<DB> & { pool: PoolType };

declare global {
	var __kyselyDb: KyselyDbWithPool | null;
}

export const databaseScope = new AsyncLocalStorage<KyselyDbWithPool>();

export function createDb(): KyselyDbWithPool {
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
		pool = new PgPool({
			connectionString,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 30000,
		});
	} else {
		pool = new NeonPool({ connectionString });
	}

	const db = new Kysely<DB>({
		dialect: new PostgresDialect({
			// NeonのClient.connectはKyselyの制御用Clientと型が異なるため、
			// 共通のPool APIを渡し、ローカルの取消には独立接続を使う。
			...(isLocal ? { controlClient: PgClient } : {}),
			pool: {
				connect: () => pool.connect(),
				end: () => pool.end(),
				options: pool.options,
			},
		}),
		plugins: [new CamelCasePlugin()],
	});

	return Object.assign(db, { pool });
}

export const db = new Proxy({} as KyselyDbWithPool, {
	get(_target, property) {
		let current = databaseScope.getStore() ?? globalThis.__kyselyDb;
		if (!current) {
			current = createDb();
			globalThis.__kyselyDb = current;
		}
		const value = Reflect.get(current, property);
		// fnはcountなどのメソッドを持つ関数オブジェクトなのでbindで置き換えない。
		return typeof value === "function" && property !== "fn"
			? value.bind(current)
			: value;
	},
});

export async function disposeDb(): Promise<void> {
	await globalThis.__kyselyDb?.destroy();
	globalThis.__kyselyDb = createDb();
}
