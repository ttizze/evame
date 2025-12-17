import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { disposeDb } from "@/db";
import { setupMasterData } from "./db-helpers";

const BASE_URL = "postgres://postgres:postgres@db.localtest.me:5435/main";
const SERVICE = "test_neon";

/** PostgreSQLコマンドを実行 */
function psql(sql: string): void {
	execSync(`docker compose exec -T ${SERVICE} psql -U postgres -c "${sql}"`, {
		stdio: "pipe",
	});
}

/** DB接続をリセット（Drizzle + Kysely） */
export async function resetAllClients(): Promise<void> {
	// Kysely
	await disposeDb();
}

/** テストファイルごとにDBを作成（マイグレーション + マスターデータ） */
export async function setupDbPerFile(fileUrl: string): Promise<void> {
	const fileId = createHash("sha256")
		.update(fileUrl)
		.digest("hex")
		.slice(0, 10);
	const dbName = `main_test_${fileId}`;
	const dbUrl = BASE_URL.replace(/\/main$/, `/${dbName}`);

	// 接続切断 → DB再作成
	psql(
		`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbName}' AND pid<>pg_backend_pid()`,
	);
	psql(`DROP DATABASE IF EXISTS "${dbName}"`);
	psql(`CREATE DATABASE "${dbName}" WITH TEMPLATE=template0`);

	// マイグレーション実行
	execSync(
		`bunx atlas schema apply -u "${dbUrl}?search_path=public&sslmode=disable" --to file://atlas/schema.sql --dev-url "docker://postgres/17/dev?search_path=public" --auto-approve`,
		{ stdio: "pipe" },
	);

	// マスターデータ投入
	process.env.DATABASE_URL = dbUrl;
	await resetAllClients();
	await setupMasterData();
	await resetAllClients();
}
