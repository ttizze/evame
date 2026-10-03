// @vitest-environment node

import { sql } from "kysely";
import { Client } from "pg";
import { expect, it } from "vitest";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { db } from "./index";

await setupDbPerFile(import.meta.url);

it("接続プールが埋まっていてもDB上で実行中のクエリーを取り消せる", async () => {
	const observer = new Client({ connectionString: process.env.DATABASE_URL });
	await observer.connect();
	const clients = await Promise.all(
		Array.from({ length: 19 }, () => db.pool.connect()),
	);
	const controller = new AbortController();
	const query = sql`select pg_sleep(60)`.execute(db, {
		signal: controller.signal,
		inflightQueryAbortStrategy: "cancel query",
	});
	const countActiveSleeps = async () => {
		const result = await observer.query(
			"select count(*) from pg_stat_activity where datname = current_database() and state = 'active' and query = $1",
			["select pg_sleep(60)"],
		);
		return Number(result.rows[0].count);
	};
	try {
		await expect.poll(countActiveSleeps).toBe(1);
		controller.abort(new Error("query aborted"));
		await expect(query).rejects.toThrow("query aborted");
		await expect.poll(countActiveSleeps, { timeout: 1000 }).toBe(0);
	} finally {
		controller.abort(new Error("test finished"));
		for (const client of clients) client.release();
		await query.catch(() => {});
		await observer.end();
	}
});
