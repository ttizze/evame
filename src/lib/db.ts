import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { Kysely, PostgresDialect, } from "kysely";
import { Pool as PgPool } from "pg";
import { WebSocket } from "ws";

import type { DB } from "./db/types";

declare global {
	// eslint-disable-next-line no-var
	var __kyselyDb: Kysely<DB> | null;
}

function createDialect(): PostgresDialect {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL is not defined");
	}

	const host = new URL(connectionString).hostname;
	const isLocal = host === "db.localtest.me";

	const pool = isLocal
		? new PgPool({ connectionString })
		: (() => {
				neonConfig.webSocketConstructor = WebSocket;
				return new NeonPool({ connectionString });
			})();

	return new PostgresDialect({ pool });
}

function createDb(): Kysely<DB> {
	return new Kysely<DB>({
		dialect: createDialect(),
	});
}

export const db: Kysely<DB> = new Proxy({} as Kysely<DB>, {
	get(_target, prop) {
		if (!globalThis.__kyselyDb) {
			globalThis.__kyselyDb = createDb();
		}
		const value = globalThis.__kyselyDb[prop as keyof Kysely<DB>];
		return typeof value === "function"
			? value.bind(globalThis.__kyselyDb)
			: value;
	},
});

export type { DB };
