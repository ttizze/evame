import { createClient } from "@libsql/client";
import { afterAll, expect, inject, it } from "vitest";
import { disposeDb } from "@/db";
import { setupDbPerFile } from "./test-db-manager";

afterAll(disposeDb);

it("同じ準備済みDBから作った検証用コピーだけを変更し、別ファイルと元DBを空のまま保つ", async () => {
	const template = inject("testDatabasePath");
	expect(template).toBeTruthy();
	const original = createClient({ url: `file:${template}` });
	await setupDbPerFile(import.meta.url);
	const firstUrl = process.env.TURSO_DATABASE_URL!;
	const first = createClient({ url: firstUrl });
	let second: ReturnType<typeof createClient> | null = null;
	try {
		await first.execute(
			"INSERT INTO users (id, name, handle, email) VALUES ('first', '検証', 'first', 'first@example.test')",
		);
		await setupDbPerFile(`${import.meta.url}?other-file`);
		second = createClient({ url: process.env.TURSO_DATABASE_URL! });
		expect(process.env.TURSO_DATABASE_URL).not.toBe(firstUrl);
		expect((await first.execute("SELECT id FROM users")).rows).toEqual([
			{ id: "first" },
		]);
		expect((await second.execute("SELECT id FROM users")).rows).toEqual([]);
		expect((await original.execute("SELECT id FROM users")).rows).toEqual([]);
		expect(
			(
				await second.execute(
					"SELECT hash FROM __drizzle_migrations ORDER BY id",
				)
			).rows,
		).toEqual(
			(
				await original.execute(
					"SELECT hash FROM __drizzle_migrations ORDER BY id",
				)
			).rows,
		);
	} finally {
		first.close();
		second?.close();
		original.close();
	}
});

it("同じ検証ファイルの再初期化では前の書き込みとWALを引き継がない", async () => {
	await setupDbPerFile(import.meta.url);
	const url = process.env.TURSO_DATABASE_URL!;
	const first = createClient({ url });
	try {
		await first.execute(
			"INSERT INTO users (id, name, handle, email) VALUES ('previous', '前回', 'previous', 'previous@example.test')",
		);
	} finally {
		first.close();
	}
	await setupDbPerFile(import.meta.url);
	expect(process.env.TURSO_DATABASE_URL).toBe(url);
	const next = createClient({ url });
	try {
		expect((await next.execute("SELECT id FROM users")).rows).toEqual([]);
	} finally {
		next.close();
	}
});
