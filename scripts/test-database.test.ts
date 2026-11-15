import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { LOCALE_CONTENT } from "../src/db/seed-data/content";
import { copyTestDatabase, prepareTestDatabase } from "./test-database.mjs";

let directory: string;
let template: string;
beforeAll(async () => {
	directory = await mkdtemp(resolve(".data/database-fixture-test-"));
	template = join(directory, "seeded.db");
	await prepareTestDatabase(template, true);
}, 30_000);
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
	if (directory) await rm(directory, { recursive: true, force: true });
});

it("コピーしたSQLiteだけで全段落・全翻訳・翻訳ジョブを復元し、外部キーも保つ", async () => {
	vi.stubEnv("EVAME_TEST_DATABASE_TEMPLATE", template);
	const copy = join(directory, "content.db");
	await copyTestDatabase(copy);
	const database = createClient({ url: `file:${copy}` });
	try {
		expect((await database.execute("PRAGMA integrity_check")).rows).toEqual([
			{ integrity_check: "ok" },
		]);
		expect((await database.execute("PRAGMA foreign_key_check")).rows).toEqual(
			[],
		);
		for (const [slug, sourceLocale, locales] of [
			["evame", "en", ["ja", "zh", "ko", "es"]],
			["evame-ja", "ja", ["en", "zh", "ko", "es"]],
		] as const) {
			const result = await database.execute({
				sql: "SELECT s.number, s.text AS original, t.locale, t.text FROM pages p JOIN segments s ON s.content_id = p.id JOIN segment_translations t ON t.segment_id = s.id WHERE p.slug = ? ORDER BY s.number, t.locale",
				args: [slug],
			});
			expect(result.rows).toEqual(
				LOCALE_CONTENT.en.sections.flatMap((section, number) =>
					[...locales].sort().map((locale) => ({
						number,
						original: LOCALE_CONTENT[sourceLocale].sections.find(
							(item) => item.id === section.id,
						)!.text,
						locale,
						text: LOCALE_CONTENT[locale].sections.find(
							(item) => item.id === section.id,
						)!.text,
					})),
				),
			);
			expect(
				(
					await database.execute({
						sql: "SELECT j.locale, j.status FROM translation_jobs j JOIN pages p ON p.id = j.page_id WHERE p.slug = ? ORDER BY j.locale",
						args: [slug],
					})
				).rows,
			).toEqual(
				[...locales].sort().map((locale) => ({ locale, status: "COMPLETED" })),
			);
		}
	} finally {
		database.close();
	}
	expect(await readdir(directory)).not.toContain("seeded.db-wal");
});

it("別の検証で記事を変更しても、もう一方のコピーと配布元SQLiteは変わらない", async () => {
	vi.stubEnv("EVAME_TEST_DATABASE_TEMPLATE", template);
	const digest = createHash("sha256")
		.update(await readFile(template))
		.digest("hex");
	const paths = [join(directory, "first.db"), join(directory, "second.db")];
	await Promise.all(paths.map((path) => copyTestDatabase(path)));
	const first = createClient({ url: `file:${paths[0]}` });
	const second = createClient({ url: `file:${paths[1]}` });
	try {
		await first.execute("UPDATE segments SET text = '変更した本文'");
		expect(
			(
				await second.execute(
					"SELECT count(*) AS count FROM segments WHERE text = '変更した本文'",
				)
			).rows,
		).toEqual([{ count: 0 }]);
		expect(
			(
				await first.execute(
					"SELECT count(*) AS count FROM segments WHERE text = '変更した本文'",
				)
			).rows[0].count,
		).toBeGreaterThan(0);
	} finally {
		first.close();
		second.close();
	}
	expect(
		createHash("sha256")
			.update(await readFile(template))
			.digest("hex"),
	).toBe(digest);
});

it("指定したCIのSQLite成果物が欠けていれば初期化で隠さず失敗する", async () => {
	vi.stubEnv("EVAME_TEST_DATABASE_TEMPLATE", join(directory, "missing.db"));
	await expect(
		copyTestDatabase(join(directory, "missing-copy.db")),
	).rejects.toThrow();
});

it("ローカルで成果物を指定しない場合もSQLiteへ直接初期データを用意する", async () => {
	vi.stubEnv("EVAME_TEST_DATABASE_TEMPLATE", "");
	const path = join(directory, "standalone.db");
	await copyTestDatabase(path);
	const database = createClient({ url: `file:${path}` });
	try {
		expect(
			(await database.execute("SELECT slug FROM pages ORDER BY slug")).rows,
		).toEqual([{ slug: "evame" }, { slug: "evame-ja" }]);
	} finally {
		database.close();
	}
}, 30_000);
