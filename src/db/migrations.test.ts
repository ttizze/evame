import { describe, expect, test } from "vitest";
import { migrateDatabase } from "./migrations";
import type { SqlExecutor, TursoDatabase } from "./turso-types";

function createMigrationDb() {
	const applied: string[] = [];
	const statements: string[] = [];
	const executor: SqlExecutor = {
		async get<T>(_sql: string, _args = []) {
			return undefined as T | undefined;
		},
		async all<T>(sql: string, _args = []) {
			if (sql === "SELECT id FROM schema_migrations") {
				return applied.map((id) => ({ id })) as T[];
			}
			return [] as T[];
		},
		async run(sql: string, args = []) {
			statements.push(sql);
			if (sql === "INSERT INTO schema_migrations (id) VALUES (?)") {
				applied.push(String(args[0]));
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
	};
	const db: TursoDatabase = {
		...executor,
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(executor);
		},
		async close() {},
	};
	return { db, applied, statements };
}

describe("migrateDatabase", () => {
	test("初回は全スキーマを適用し、再実行では同じmigrationを適用しない", async () => {
		const { db, applied, statements } = createMigrationDb();
		await migrateDatabase(db);
		const firstRunStatementCount = statements.length;

		expect(applied).toEqual(["0001_initial"]);
		expect(
			statements.some((sql) =>
				sql.includes("CREATE TABLE IF NOT EXISTS users"),
			),
		).toBe(true);
		expect(
			statements.some((sql) =>
				sql.includes("CREATE TABLE IF NOT EXISTS translation_votes"),
			),
		).toBe(true);

		await migrateDatabase(db);
		expect(applied).toEqual(["0001_initial"]);
		expect(statements).toHaveLength(firstRunStatementCount + 1);
	});
});
