import { AsyncLocalStorage } from "node:async_hooks";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { CamelCasePlugin, Kysely } from "kysely";
import { SearchValuesPlugin } from "./search-values-plugin";
import { TursoValueCodecPlugin } from "./turso-value-codec";
import type { DB } from "./types";

declare global {
	var __kyselyDb: Kysely<DB> | null;
}

export const databaseScope = new AsyncLocalStorage<Kysely<DB>>();

export function createDb(): Kysely<DB> {
	const url =
		process.env.TURSO_DATABASE_URL ||
		(process.env.NODE_ENV === "test" ? "file::memory:" : "");
	if (!url) throw new Error("TURSO_DATABASE_URL is not defined");
	return new Kysely<DB>({
		dialect: new LibsqlDialect({
			url,
			authToken: process.env.TURSO_AUTH_TOKEN,
			...(url.startsWith("file:") ? { timeout: 0 } : {}),
		}),
		plugins: [
			new CamelCasePlugin(),
			new SearchValuesPlugin(),
			new TursoValueCodecPlugin(),
		],
	});
}

export const db = new Proxy({} as Kysely<DB>, {
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
	globalThis.__kyselyDb = null;
}
