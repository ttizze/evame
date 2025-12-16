import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { pool } from "./pool";
import type { DB } from "./types";

export const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool,
	}),
	plugins: [new CamelCasePlugin()],
});
