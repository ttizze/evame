import { execSync } from "node:child_process";
import { afterAll, beforeAll } from "vitest";
import { setupMasterData } from "./src/tests/db-helpers";

const baseDbUrl = "postgres://postgres:postgres@db.localtest.me:5435/main";
const workerId = process.env.VITEST_WORKER_ID ?? "0";
const containerService = "test_neon";

function buildDbUrl(dbName: string): string {
	const url = new URL(baseDbUrl);
	url.pathname = `/${dbName}`;
	return url.toString();
}

const baseDbName = new URL(baseDbUrl).pathname.slice(1) || "main";
const templateDbName = `${baseDbName}_test_template`;
const workerDbName = `${baseDbName}_test_${workerId}`;
const templateDbUrl = buildDbUrl(templateDbName);
const workerDbUrl = buildDbUrl(workerDbName);

function checkDatabaseExists(dbName: string): boolean {
	const result = execSync(
		`docker compose exec -T ${containerService} psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`,
		{ encoding: "utf-8" },
	).trim();
	return result === "1";
}

function runMigrations(dbUrl: string, silent = false): void {
	execSync("bunx prisma migrate deploy", {
		env: { ...process.env, DATABASE_URL: dbUrl },
		stdio: silent ? "pipe" : "inherit",
	});
}

async function resetPrismaClient(): Promise<void> {
	if (globalThis.prisma) {
		await globalThis.prisma.$disconnect();
		delete (globalThis as { prisma?: unknown }).prisma;
	}
}

async function setupTemplateDatabase(): Promise<void> {
	if (checkDatabaseExists(templateDbName)) {
		try {
			runMigrations(templateDbUrl, true);
		} catch {
			// 既に適用済みの可能性があるため無視
		}
		return;
	}

	console.log(`[Template] Creating template database: ${templateDbName}`);
	execSync(
		`docker compose exec -T ${containerService} psql -U postgres -c 'CREATE DATABASE "${templateDbName}" WITH TEMPLATE=template0;'`,
		{ stdio: "inherit" },
	);

	runMigrations(templateDbUrl);

	// テンプレートDBにマスターデータをセットアップ
	// テンプレートDBにマスターデータを入れておけば、各ワーカーDBはテンプレートからコピーされるので
	// マスターデータも含まれる（各ワーカーDBに対して個別にセットアップする必要がない）
	process.env.DATABASE_URL = templateDbUrl;
	await resetPrismaClient(); // 環境変数変更前に古いPrismaクライアントを切断
	await setupMasterData(); // テンプレートDBに対してマスターデータをセットアップ

	console.log(`[Template] Template database setup completed`);
}

function createWorkerDatabase(): void {
	if (checkDatabaseExists(workerDbName)) {
		return;
	}

	console.log(
		`[Worker ${workerId}] Creating test database from template: ${workerDbName}`,
	);
	try {
		execSync(
			`docker compose exec -T ${containerService} psql -U postgres -c 'DROP DATABASE IF EXISTS "${workerDbName}";'`,
			{ stdio: "pipe" },
		);
	} catch {
		// 無視
	}
	execSync(
		`docker compose exec -T ${containerService} psql -U postgres -c 'CREATE DATABASE "${workerDbName}" WITH TEMPLATE="${templateDbName}";'`,
		{ stdio: "inherit" },
	);
}

beforeAll(async () => {
	const workerInfo = `[Worker ${workerId}]`;

	try {
		// 1. テンプレートDBをセットアップ（マスターデータ含む）
		await setupTemplateDatabase();

		// 2. ワーカーDB用の環境変数を設定
		process.env.DATABASE_URL = workerDbUrl;
		await resetPrismaClient();

		// 3. ワーカーDBをテンプレートから作成
		createWorkerDatabase();

		console.log(`${workerInfo} Test setup completed`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.warn(`${workerInfo} Database setup warning: ${errorMessage}`);
	}
});

afterAll(async () => {
	const { prisma } = await import("@/lib/prisma");
	await prisma.$disconnect();
});
