// @vitest-environment node
import { sql } from "kysely";
import { afterAll, expect, it, vi } from "vitest";
import { createUser } from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { startTursoServer } from "../../scripts/turso-dev-server.mjs";
import { createDb, databaseScope, db, disposeDb } from "./index";
import { runTransaction } from "./transaction";

await setupDbPerFile(import.meta.url);
const server = await startTursoServer(
	process.env.TURSO_DATABASE_URL!.replace(/^file:/, ""),
	null,
);
process.env.TURSO_DATABASE_URL = server.url;
afterAll(async () => {
	await disposeDb();
	await server.stop();
});

it("同じDBクライアントの独立したHTTPクエリを互いの応答待ちで止めない", async () => {
	const originalFetch = globalThis.fetch;
	const gate = Promise.withResolvers<void>();
	let requests = 0;
	const fetch = vi
		.spyOn(globalThis, "fetch")
		.mockImplementation(async (...args) => {
			requests++;
			await gate.promise;
			return originalFetch(...args);
		});
	const database = createDb();
	const queries = Promise.all([
		sql<{ value: number }>`select 1 as value`.execute(database),
		sql<{ value: number }>`select 2 as value`.execute(database),
	]);
	try {
		await vi.waitFor(() => expect(requests).toBe(2), { timeout: 2000 });
	} finally {
		gate.resolve();
		await queries;
		await database.destroy();
		fetch.mockRestore();
	}
	expect((await queries).map((result) => result.rows[0].value)).toEqual([1, 2]);
});

it("HTTPトランザクションの未確定の更新を別のクエリから読ませない", async () => {
	const user = await createUser();
	const database = createDb();
	const ready = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	const transaction = database.transaction().execute(async (tx) => {
		await tx
			.updateTable("users")
			.set({ totalPoints: 100 })
			.where("id", "=", user.id)
			.execute();
		ready.resolve();
		await release.promise;
	});
	await ready.promise;
	let visiblePoints: number | undefined;
	const outside = database
		.selectFrom("users")
		.select("totalPoints")
		.where("id", "=", user.id)
		.executeTakeFirstOrThrow()
		.then((row) => {
			visiblePoints = row.totalPoints;
		});
	try {
		await vi.waitFor(() => expect(visiblePoints).toBe(0), { timeout: 2000 });
	} finally {
		release.resolve();
		await Promise.all([transaction, outside]);
		await database.destroy();
	}
	expect(
		(
			await db
				.selectFrom("users")
				.select("totalPoints")
				.where("id", "=", user.id)
				.executeTakeFirstOrThrow()
		).totalPoints,
	).toBe(100);
});

it("HTTP接続でも存在しない記事への段落追加を外部キー制約で拒否する", async () => {
	await expect(
		db
			.insertInto("segments")
			.values({
				contentId: -1,
				number: 0,
				text: "親記事がない段落",
				textAndOccurrenceHash: "missing-content",
			})
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
});

it("並行する20件の書き込みを再試行し、更新を失わずに保存する", async () => {
	const user = await createUser();
	await Promise.all(
		Array.from({ length: 20 }, async () => {
			const database = createDb();
			try {
				await databaseScope.run(database, () =>
					runTransaction(async (tx) => {
						const current = await tx
							.selectFrom("users")
							.select("totalPoints")
							.where("id", "=", user.id)
							.executeTakeFirstOrThrow();
						await new Promise((resolve) => setTimeout(resolve, 1));
						await tx
							.updateTable("users")
							.set({ totalPoints: current.totalPoints + 1 })
							.where("id", "=", user.id)
							.execute();
					}),
				);
			} finally {
				await database.destroy();
			}
		}),
	);
	expect(
		(
			await db
				.selectFrom("users")
				.select("totalPoints")
				.where("id", "=", user.id)
				.executeTakeFirstOrThrow()
		).totalPoints,
	).toBe(20);
});

it("トランザクション途中の失敗では全変更を取り消す", async () => {
	const user = await createUser();
	await expect(
		runTransaction(async (tx) => {
			await tx
				.updateTable("users")
				.set({ totalPoints: 100 })
				.where("id", "=", user.id)
				.execute();
			throw new Error("保存を中断");
		}),
	).rejects.toThrow("保存を中断");
	expect(
		(
			await db
				.selectFrom("users")
				.select("totalPoints")
				.where("id", "=", user.id)
				.executeTakeFirstOrThrow()
		).totalPoints,
	).toBe(0);
});
