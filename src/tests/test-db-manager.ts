import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { resetDatabase, setupMasterData } from "./db-helpers";

declare global {
	var __prismaClient: PrismaClient | null;
}

export const baseDbUrl =
	"postgres://postgres:postgres@db.localtest.me:5435/main";
export const containerService = "test_neon";

export function buildDbUrl(dbName: string): string {
	const url = new URL(baseDbUrl);
	url.pathname = `/${dbName}`;
	return url.toString();
}

export const baseDbName = new URL(baseDbUrl).pathname.slice(1) || "main";
export const templateDbName = `${baseDbName}_test_template`;
export const templateDbUrl = buildDbUrl(templateDbName);

function checkDatabaseExists(dbName: string): boolean {
	const result = execSync(
		`docker compose exec -T ${containerService} psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`,
		{ encoding: "utf-8" },
	).trim();
	return result === "1";
}

function terminateConnections(dbName: string): void {
	try {
		execSync(
			`docker compose exec -T ${containerService} psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`,
			{ stdio: "pipe" },
		);
	} catch {
		// ignore
	}
}

function runMigrations(dbUrl: string, silent = false): void {
	const env = { ...process.env, DATABASE_URL: dbUrl };
	const stdio = silent ? "pipe" : "inherit";

	// Drizzleのマイグレーションを適用し、Prisma Clientを再生成
	execSync("bunx drizzle-kit migrate", { env, stdio });
	execSync("bunx prisma generate", { env, stdio });
}

export async function resetPrismaClient(): Promise<void> {
	if (globalThis.__prismaClient) {
		await globalThis.__prismaClient.$disconnect();
		globalThis.__prismaClient = null;
	}
}

export async function ensureTemplateDatabase(): Promise<void> {
	if (checkDatabaseExists(templateDbName)) {
		// マイグレーション前に接続を切っておく
		terminateConnections(templateDbName);

		try {
			runMigrations(templateDbUrl, true);
		} catch {
			// ignore if already up-to-date
		}

		process.env.DATABASE_URL = templateDbUrl;
		await resetPrismaClient();
		// 古いテストデータが残っているとクローン側に汚染が伝搬するので、テンプレートDBを毎回クリーンにする
		await resetDatabase();
		await setupMasterData();
		await resetPrismaClient();
		return;
	}

	execSync(
		`docker compose exec -T ${containerService} psql -U postgres -c 'CREATE DATABASE "${templateDbName}" WITH TEMPLATE=template0;'`,
		{ stdio: "pipe" },
	);

	runMigrations(templateDbUrl);

	process.env.DATABASE_URL = templateDbUrl;
	await resetPrismaClient();
	// 新規作成時も必ず空にしてからマスターデータを投入
	await resetDatabase();
	await setupMasterData();
	await resetPrismaClient();
}

export function cloneTemplateDatabase(dbName: string): void {
	// 念のためテンプレートDBへの接続を強制切断（並列実行時の競合回避）
	terminateConnections(templateDbName);

	try {
		terminateConnections(dbName); // 既存DBへの接続も切断
		execSync(
			`docker compose exec -T ${containerService} psql -U postgres -c 'DROP DATABASE IF EXISTS "${dbName}";'`,
			{ stdio: "pipe" },
		);
	} catch {
		// ignore drop errors
	}

	execSync(
		`docker compose exec -T ${containerService} psql -U postgres -c 'CREATE DATABASE "${dbName}" WITH TEMPLATE="${templateDbName}";'`,
		{ stdio: "pipe" },
	);
}

function getFileId(fileUrl: string): string {
	return createHash("sha256").update(fileUrl).digest("hex").slice(0, 10);
}

/**
 * Ensures a dedicated database exists for the current test file.
 * Must be awaited at the top level of the test file or in beforeAll.
 *
 * @param fileUrl - The import.meta.url of the calling test file
 */
export async function setupDbPerFile(fileUrl: string) {
	if (!fileUrl) {
		throw new Error("setupDbPerFile requires import.meta.url as argument");
	}

	const fileId = getFileId(fileUrl);
	const dbName = `${baseDbName}_test_${fileId}`;
	const dbUrl = buildDbUrl(dbName);

	cloneTemplateDatabase(dbName);

	process.env.DATABASE_URL = dbUrl;
	await resetPrismaClient();
}
