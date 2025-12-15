import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import type { DB } from "kysely-codegen/dist/db";
import { pool } from "./pool";

export const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool,
	}),
	plugins: [new CamelCasePlugin()],
});
