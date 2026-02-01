import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const connectMock = vi.fn();
const endMock = vi.fn();
let lastConnectionString = "";

vi.mock("pg", () => {
	return {
		Client: class {
			constructor({ connectionString }: { connectionString: string }) {
				lastConnectionString = connectionString;
			}
			connect = connectMock;
			end = endMock;
			query = queryMock;
		},
	};
});

import { buildDatabaseName, ensureDatabaseExists } from "./with-branch-db";

describe("with-branch-db", () => {
	beforeEach(() => {
		queryMock.mockReset();
		connectMock.mockReset();
		endMock.mockReset();
		lastConnectionString = "";
	});

	it("ブランチ名が混じっていてもDB名を安全な形式に整える", () => {
		expect(buildDatabaseName("main", "feature/ABC-123")).toBe(
			"main__feature_abc_123",
		);
	});

	it("対象DBが存在しないときはベースDBから複製する", async () => {
		queryMock
			.mockResolvedValueOnce({ rowCount: 0 })
			.mockResolvedValueOnce({ rowCount: 0 });

		await ensureDatabaseExists(
			"postgres://user:pass@db.localtest.me:5434/main",
			"main__feature",
			"main",
		);

		expect(lastConnectionString).toBe(
			"postgres://user:pass@db.localtest.me:5434/postgres",
		);
		expect(queryMock).toHaveBeenNthCalledWith(
			1,
			"SELECT 1 FROM pg_database WHERE datname = $1",
			["main__feature"],
		);
		expect(queryMock).toHaveBeenNthCalledWith(
			2,
			'CREATE DATABASE "main__feature" WITH TEMPLATE "main"',
		);
	});

	it("対象DBが存在する場合は複製しない", async () => {
		queryMock.mockResolvedValueOnce({ rowCount: 1 });

		await ensureDatabaseExists(
			"postgres://user:pass@db.localtest.me:5434/main",
			"main__feature",
			"main",
		);

		expect(queryMock).toHaveBeenCalledTimes(1);
	});

	it("テンプレートDB名を指定できる", async () => {
		queryMock
			.mockResolvedValueOnce({ rowCount: 0 })
			.mockResolvedValueOnce({ rowCount: 0 });

		await ensureDatabaseExists(
			"postgres://user:pass@db.localtest.me:5434/main",
			"main__feature",
			"main_template",
		);

		expect(queryMock).toHaveBeenNthCalledWith(
			2,
			'CREATE DATABASE "main__feature" WITH TEMPLATE "main_template"',
		);
	});
});
