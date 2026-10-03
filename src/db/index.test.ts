// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createDb, databaseScope, db } from "./index";

describe("リクエストごとのDB接続", () => {
	it("リクエスト内で件数集計を含むKyselyの関数を使用できる", async () => {
		const database = createDb();
		try {
			databaseScope.run(database, () => {
				const query = db
					.selectFrom("users")
					.select(db.fn.count("id").as("total"))
					.compile();
				expect(query.sql).toBe('select count("id") as "total" from "users"');
			});
		} finally {
			await database.destroy();
		}
	});
	it("並行して非同期処理をしても各リクエストの接続を使う", async () => {
		const first = createDb();
		const second = createDb();
		try {
			await Promise.all(
				[first, second].map((database) =>
					databaseScope.run(database, async () => {
						await new Promise((resolve) => setTimeout(resolve, 0));
						expect(db.pool).toBe(database.pool);
					}),
				),
			);
		} finally {
			await Promise.all([first.destroy(), second.destroy()]);
		}
	});
});
