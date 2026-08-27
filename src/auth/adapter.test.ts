import type { BetterAuthOptions } from "@better-auth/core";
import { describe, expect, it, vi } from "vitest";
import type {
	SqlArguments,
	SqlExecutor,
	TursoDatabase,
} from "@/db/turso-types";
import { createTursoAdapter, quoteIdentifier, whereClause } from "./adapter";

function createMemoryDatabase() {
	const get = vi.fn(async (_sql: string, _args?: readonly unknown[]) => {
		return { id: "user-1", email: "person@example.com" };
	});
	const all = vi.fn(async <T>(_sql: string, _args?: readonly unknown[]) => {
		return [] as T[];
	});
	const run = vi.fn(async (_sql: string, _args?: readonly unknown[]) => ({
		changes: 1,
		lastInsertRowid: undefined,
	}));
	const executor: SqlExecutor = {
		get: async <T>(sql: string, args?: SqlArguments) =>
			(await get(sql, args)) as T | undefined,
		all: async <T>(sql: string, args?: SqlArguments) =>
			(await all(sql, args)) as T[],
		run: async (sql: string, args?: SqlArguments) => run(sql, args),
	};
	const database: TursoDatabase = {
		...executor,
		async transaction(callback) {
			return callback(executor);
		},
		async close() {},
	};
	return { database, get, all, run };
}

function adapterOptions(): BetterAuthOptions {
	return {
		user: {
			modelName: "users",
			fields: {
				emailVerified: "email_verified",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		session: {
			modelName: "sessions",
			fields: {
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
				userId: "user_id",
			},
		},
	};
}

describe("Better Auth Turso adapter", () => {
	it("ユーザー検索をsnake_caseのTurso SQLへ変換する", async () => {
		const memory = createMemoryDatabase();
		const adapter = createTursoAdapter(memory.database)(adapterOptions());

		await adapter.findOne({
			model: "user",
			where: [
				{
					field: "email",
					value: "person@example.com",
					operator: "eq",
					connector: "AND",
					mode: "sensitive",
				},
			],
		});

		expect(memory.get).toHaveBeenCalledWith(
			expect.stringContaining('FROM "users"'),
			["person@example.com"],
		);
	});

	it("作成時にBetter AuthのIDを保存し、保存結果を返す", async () => {
		const memory = createMemoryDatabase();
		const adapter = createTursoAdapter(memory.database)(adapterOptions());

		const user = await adapter.create({
			model: "user",
			data: {
				id: "user-1",
				email: "person@example.com",
				name: "Person",
				handle: "person",
			},
			forceAllowId: true,
		});

		expect(memory.run).toHaveBeenCalledWith(
			expect.stringContaining('INSERT INTO "users"'),
			expect.arrayContaining(["person@example.com"]),
		);
		expect(user).toMatchObject({ id: "user-1" });
	});

	it("トランザクション内では同じDB操作を原子的に実行する", async () => {
		const memory = createMemoryDatabase();
		const adapter = createTursoAdapter(memory.database)(adapterOptions());
		const callback = vi.fn(async () => "done");

		await expect(adapter.transaction(callback)).resolves.toBe("done");
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("Better Auth SQL境界", () => {
	it("識別子へのSQL断片混入を拒否する", () => {
		expect(() => quoteIdentifier("users; DROP TABLE users")).toThrow();
	});

	it("LIKE検索のワイルドカードを値として扱う", () => {
		const result = whereClause([
			{
				field: "email",
				value: "%admin_",
				operator: "contains",
				connector: "AND",
				mode: "sensitive",
			},
		]);

		expect(result.clause).toContain("LIKE ? ESCAPE");
		expect(result.args).toEqual(["%\\%admin\\_%"]);
	});
});
