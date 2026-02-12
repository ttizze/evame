import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { disposeDb } from "@/db";
import { setupMasterData } from "./db-helpers";

const BASE_URL = "postgres://postgres:postgres@db.localtest.me:5435/main";
const SERVICE = "test_neon";

function canConnectWithHostPsql(): boolean {
	try {
		execFileSync("psql", ["--version"], { stdio: "ignore" });
	} catch {
		return false;
	}

	try {
		execFileSync(
			"psql",
			[BASE_URL, "-v", "ON_ERROR_STOP=1", "-c", "SELECT 1;"],
			{
				stdio: "ignore",
				env: { ...process.env, PGCONNECT_TIMEOUT: "2" },
			},
		);
		return true;
	} catch {
		return false;
	}
}

const USE_HOST_PSQL = canConnectWithHostPsql();

/** PostgreSQLコマンドを実行 */
function psql(sql: string): void {
	if (USE_HOST_PSQL) {
		execFileSync("psql", [BASE_URL, "-v", "ON_ERROR_STOP=1", "-c", sql], {
			stdio: "pipe",
			env: { ...process.env, PGCONNECT_TIMEOUT: "5" },
		});
		return;
	}

	execFileSync(
		"docker",
		[
			"compose",
			"exec",
			"-T",
			SERVICE,
			"psql",
			"-U",
			"postgres",
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			sql,
		],
		{ stdio: "pipe" },
	);
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
	execSync("bunx drizzle-kit migrate", {
		env: { ...process.env, DATABASE_URL: dbUrl },
		stdio: "pipe",
	});

	// マスターデータ投入
	process.env.DATABASE_URL = dbUrl;
	await resetAllClients();
	await setupMasterData();
	await resetAllClients();
}
