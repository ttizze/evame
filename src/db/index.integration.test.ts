// @vitest-environment node
import { afterAll, expect, it } from "vitest";
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
