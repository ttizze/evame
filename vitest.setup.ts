import "@testing-library/jest-dom";
import { execSync } from "node:child_process";
import { afterAll, beforeAll, vi } from "vitest";
import { setupMasterData } from "./src/tests/db-helpers";

// Provide a default mock for next/navigation across tests.
// Individual tests can override with their own vi.mock if necessary.
vi.mock("next/navigation", () => ({
	usePathname: vi.fn(() => "/"),
	useSearchParams: vi.fn(() => new URLSearchParams()),
	useParams: vi.fn(() => ({})),
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	})),
	redirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	permanentRedirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
	revalidatePath: vi.fn(),
}));

// ベースURLを取得（元のDATABASE_URL、worker IDベースではない）
const baseUrl =
	process.env.DATABASE_URL ||
	"postgres://postgres:postgres@db.localtest.me:5435/main";
const workerId = process.env.VITEST_WORKER_ID ?? "0";

// DB名だけworkerごとに変える
// 例: postgres://.../main -> main_test_1, main_test_2, ...
const url = new URL(baseUrl);
const originalDbName = url.pathname.slice(1) || "main";
const finalTestDbName = `${originalDbName}_test_${workerId}`;

// workerごとのDB URLを生成
const testDbUrl = baseUrl.replace(/\/[^/]+$/, `/${finalTestDbName}`);

// process.env.DATABASE_URLを更新（@/lib/prismaが自動的にこのURLを使う）
process.env.DATABASE_URL = testDbUrl;

beforeAll(async () => {
	const workerInfo = `[Worker ${workerId}]`;

	try {
		// 1. test DBを作成（存在しなければ）
		// Dockerコンテナ内のPostgreSQLを使用
		console.log(`${workerInfo} Creating test database: ${finalTestDbName}`);
		execSync(
			`docker exec test_neon psql -U postgres -c 'CREATE DATABASE "${finalTestDbName}" WITH TEMPLATE=template0;'`,
			{ stdio: "ignore" },
		);
	} catch (error) {
		// データベースが既に存在する場合は無視
		const errorMessage = String(error);
		if (!errorMessage.includes("already exists")) {
			console.warn(`${workerInfo} Database creation warning: ${errorMessage}`);
		}
	}

	try {
		// 2. そのDBに対してマイグレーションを適用
		console.log(`${workerInfo} Running database migrations...`);
		execSync("bunx prisma migrate deploy", {
			env: { ...process.env, DATABASE_URL: testDbUrl },
			stdio: "inherit",
		});

		// 3. マスターデータをセットアップ（SegmentTypeなど）
		console.log(`${workerInfo} Setting up master data...`);
		await setupMasterData();

		console.log(`${workerInfo} Test setup completed`);
	} catch (error) {
		console.error(`${workerInfo} Test setup failed:`, error);
		// エラーが発生してもテストを続行（既にセットアップ済みの可能性があるため）
	}
});

afterAll(async () => {
	// @/lib/prismaからインポートしたprismaクライアントを切断
	const { prisma } = await import("@/lib/prisma");
	await prisma.$disconnect();
	// 後片付けまでやりたければ DROP DATABASE してもよい
	// ただし、次回のテスト実行時に再作成が必要になる
});
