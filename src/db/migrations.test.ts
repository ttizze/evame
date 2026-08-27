import { describe, expect, test } from "vitest";
import { migrateDatabase, migrations } from "./migrations";
import type { SqlExecutor, TursoDatabase } from "./turso-types";

function createMigrationDb(initialApplied: readonly string[] = []) {
	const applied: string[] = [...initialApplied];
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

		expect(applied).toEqual([
			"0001_initial",
			"0002_translation_job_chunks",
			"0003_translation_job_context",
		]);
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
		expect(
			statements.some((sql) =>
				sql.includes("CREATE TABLE IF NOT EXISTS translation_job_chunks"),
			),
		).toBe(true);

		await migrateDatabase(db);
		expect(applied).toEqual([
			"0001_initial",
			"0002_translation_job_chunks",
			"0003_translation_job_context",
		]);
		expect(statements).toHaveLength(firstRunStatementCount + 1);
	});

	test("移行スクリプトの補助テーブルがTurso移行targetの列名を満たす", () => {
		const expectedColumns = {
			personal_access_tokens: [
				"id",
				"key_hash",
				"user_id",
				"name",
				"created_at",
				"last_used_at",
			],
			import_runs: ["id", "started_at", "finished_at", "status"],
			import_files: [
				"id",
				"import_run_id",
				"path",
				"checksum",
				"status",
				"message",
				"created_at",
			],
			segment_types: ["id", "label", "key"],
			scriptures: [
				"id",
				"slug",
				"title",
				"source_locale",
				"owner_user_id",
				"import_file_id",
				"parent_id",
				"position",
				"published_at",
			],
			segments: [
				"id",
				"scripture_id",
				"segment_type_id",
				"kind",
				"position",
				"source_text",
				"text_and_occurrence_hash",
				"created_at",
			],
			like_pages: ["id", "page_id", "created_at", "user_id"],
			notifications: [
				"id",
				"user_id",
				"type",
				"read",
				"created_at",
				"actor_id",
				"page_comment_id",
				"page_id",
				"segment_translation_id",
			],
			page_locale_translation_proofs: [
				"id",
				"page_id",
				"locale",
				"translation_proof_status",
			],
			segment_metadata_types: ["id", "key", "label"],
			segment_metadata: [
				"id",
				"segment_id",
				"metadata_type_id",
				"value",
				"created_at",
			],
			tags: ["id", "name"],
			tag_pages: ["tag_id", "page_id"],
			translation_contexts: [
				"id",
				"user_id",
				"name",
				"context",
				"created_at",
				"updated_at",
			],
			page_views: ["page_id", "count"],
			user_settings: [
				"id",
				"user_id",
				"target_locales",
				"created_at",
				"updated_at",
			],
		} as const;

		const statements = migrations[0]?.statements ?? [];
		for (const [table, columns] of Object.entries(expectedColumns)) {
			const statement = statements.find((candidate) =>
				candidate.startsWith(`CREATE TABLE IF NOT EXISTS ${table} (`),
			);
			expect(statement, `${table}のDDLがありません`).toBeDefined();
			for (const column of columns) {
				expect(statement, `${table}.${column}の列がありません`).toMatch(
					new RegExp(`(?:^|\\n)\\s*${column}\\b`, "u"),
				);
			}
		}

		const schema = statements.join("\n");
		expect(schema).toContain(
			"FOREIGN KEY (import_file_id) REFERENCES import_files (id) ON DELETE SET NULL",
		);
		expect(schema).toContain(
			"FOREIGN KEY (segment_type_id) REFERENCES segment_types (id) ON DELETE RESTRICT",
		);
		const notifications = statements.find((candidate) =>
			candidate.startsWith("CREATE TABLE IF NOT EXISTS notifications ("),
		);
		expect(notifications).toContain(
			"FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE",
		);
		expect(notifications).toContain(
			"FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE",
		);
		expect(notifications).not.toMatch(
			/FOREIGN KEY \((?:page|page_comment|segment_translation)/u,
		);
		expect(schema).not.toMatch(
			/CREATE TABLE IF NOT EXISTS (?:follows|magic_link_tokens)/u,
		);
		expect(schema).not.toContain("token_hash");
	});

	test("翻訳chunkのclaim状態とleaseを永続化するmigrationを含む", () => {
		const statements = migrations[1]?.statements ?? [];
		const chunks = statements.find((statement) =>
			statement.startsWith(
				"CREATE TABLE IF NOT EXISTS translation_job_chunks (",
			),
		);
		expect(chunks).toBeDefined();
		for (const column of [
			"job_id",
			"chunk_index",
			"status",
			"lease_until",
			"lease_token",
			"enqueue_attempts",
			"processing_attempts",
			"created_at",
			"updated_at",
		]) {
			expect(
				chunks,
				`translation_job_chunks.${column}の列がありません`,
			).toMatch(new RegExp(`(?:^|\\n)\\s*${column}\\b`, "u"));
		}
		expect(chunks).toContain("PRIMARY KEY (job_id, chunk_index)");
		expect(chunks).toContain(
			"FOREIGN KEY (job_id) REFERENCES translation_jobs (id) ON DELETE CASCADE",
		);
	});

	test("既存0001を変更せず、translation_jobsへ空文字fallback付きの列を追加する", () => {
		const statements = migrations[2]?.statements ?? [];
		expect(migrations[2]?.id).toBe("0003_translation_job_context");
		expect(statements).toContain(
			"ALTER TABLE translation_jobs ADD COLUMN translation_context TEXT NOT NULL DEFAULT ''",
		);
		expect(migrations[0]?.statements.join("\n")).not.toContain(
			"translation_context TEXT",
		);
	});

	test("schema_migrationsが0002までの本番DBには0003だけを追加適用する", async () => {
		const { db, applied, statements } = createMigrationDb([
			"0001_initial",
			"0002_translation_job_chunks",
		]);

		await migrateDatabase(db);

		expect(applied).toEqual([
			"0001_initial",
			"0002_translation_job_chunks",
			"0003_translation_job_context",
		]);
		expect(statements).toContain(
			"ALTER TABLE translation_jobs ADD COLUMN translation_context TEXT NOT NULL DEFAULT ''",
		);
		expect(
			statements.filter((statement) =>
				statement.includes("CREATE TABLE IF NOT EXISTS translation_jobs"),
			),
		).toHaveLength(0);
	});
});
