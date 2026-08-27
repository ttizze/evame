import { beforeEach, describe, expect, test, vi } from "vitest";
import { migrateDatabase } from "./migrations";

const state = vi.hoisted(() => ({
	connect: vi.fn(),
	transactionStatements: [] as string[],
}));

vi.mock("@tursodatabase/serverless", () => ({
	connect: state.connect,
}));

import { createDatabase } from "./client";

beforeEach(() => {
	state.transactionStatements.length = 0;
	state.connect.mockReset();
	state.connect.mockImplementation(() => ({
		get: vi.fn(async () => undefined),
		all: vi.fn(async () => []),
		run: vi.fn(async () => ({ changes: 0 })),
		transactionAsync: vi.fn(
			(
				callback: (transaction: {
					all(sql: string, ...bindParameters: unknown[]): Promise<unknown[]>;
					run(sql: string, ...bindParameters: unknown[]): Promise<unknown>;
				}) => Promise<unknown>,
			) =>
				async () => {
					let foreignKeysEnabled = false;
					const ensureForeignKeys = () => {
						if (!foreignKeysEnabled) {
							throw new Error("foreign_keys が有効化されていません");
						}
					};
					const transaction = {
						all: vi.fn(async (sql: string, ...args: unknown[]) => {
							state.transactionStatements.push(sql);
							ensureForeignKeys();
							void args;
							return [];
						}),
						run: vi.fn(async (sql: string, ...args: unknown[]) => {
							state.transactionStatements.push(sql);
							if (sql === "PRAGMA foreign_keys = ON") {
								foreignKeysEnabled = true;
								return { changes: 0 };
							}
							ensureForeignKeys();
							void args;
							return { changes: 1 };
						}),
					};
					return callback(transaction);
				},
		),
		close: vi.fn(async () => {}),
	}));
});

describe("createDatabase", () => {
	test("fresh sessionのmutation前にtransaction handleでforeign_keysを有効化する", async () => {
		const database = createDatabase({
			url: "https://example.turso.io",
			authToken: "test-token",
		});

		await database.transaction(async (transaction) => {
			await transaction.run("INSERT INTO child (parent_id) VALUES (?)", [
				"parent-1",
			]);
		});

		expect(state.transactionStatements).toEqual([
			"PRAGMA foreign_keys = ON",
			"INSERT INTO child (parent_id) VALUES (?)",
		]);
	});

	test("migrationもfresh sessionの読み書き前にforeign_keysを有効化する", async () => {
		const database = createDatabase({ url: "https://example.turso.io" });

		await migrateDatabase(database);

		expect(state.transactionStatements.slice(0, 3)).toEqual([
			"PRAGMA foreign_keys = ON",
			"SELECT id FROM schema_migrations",
			"PRAGMA foreign_keys = ON",
		]);
	});
});
