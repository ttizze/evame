import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("watch再実行前に追加したマイグレーションを共通DBへ反映し、前回の独立コピーを変更しない", async () => {
	const directory = await mkdtemp(resolve(".data/database-setup-test-"));
	const migrations = join(directory, "src/drizzle");
	try {
		await mkdir(join(migrations, "meta"), { recursive: true });
		await writeFile(
			join(migrations, "0000_initial.sql"),
			"CREATE TABLE articles (id INTEGER PRIMARY KEY);",
		);
		await writeFile(
			join(migrations, "meta/_journal.json"),
			JSON.stringify({
				version: "7",
				dialect: "sqlite",
				entries: [
					{
						idx: 0,
						version: "6",
						when: 1,
						tag: "0000_initial",
						breakpoints: true,
					},
				],
			}),
		);
		const result = execFileSync(
			"bun",
			[
				"-e",
				`
import { access, copyFile, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
const { default: setup } = await import(process.argv[1]);
let template;
let rerun;
const teardown = await setup({
	provide(key, value) { template = value; },
	onTestsRerun(callback) { rerun = callback; },
});
let first;
let second;
try {
	await copyFile(template, "first.db");
	first = createClient({ url: "file:first.db" });
	await first.execute("INSERT INTO articles (id) VALUES (1)");
	await writeFile("src/drizzle/0001_title.sql", "ALTER TABLE articles ADD COLUMN title TEXT;");
	const journal = JSON.parse(await readFile("src/drizzle/meta/_journal.json", "utf8"));
	journal.entries.push({ idx: 1, version: "6", when: 2, tag: "0001_title", breakpoints: true });
	await writeFile("src/drizzle/meta/_journal.json", JSON.stringify(journal));
	await rerun();
	await copyFile(template, "second.db");
	second = createClient({ url: "file:second.db" });
	const result = {
		firstColumns: (await first.execute("PRAGMA table_info(articles)")).rows.map(row => row.name),
		secondColumns: (await second.execute("PRAGMA table_info(articles)")).rows.map(row => row.name),
		firstRows: (await first.execute("SELECT id FROM articles")).rows,
		secondRows: (await second.execute("SELECT id FROM articles")).rows,
	};
	await teardown();
	result.templateExistsAfterTeardown = await access(template).then(() => true, () => false);
	console.log(JSON.stringify(result));
} finally {
	first?.close();
	second?.close();
	await teardown();
}
`,
				fileURLToPath(new URL("./database-setup.ts", import.meta.url)),
			],
			{ cwd: directory, encoding: "utf8" },
		);
		expect(JSON.parse(result)).toEqual({
			firstColumns: ["id"],
			secondColumns: ["id", "title"],
			firstRows: [{ id: 1 }],
			secondRows: [],
			templateExistsAfterTeardown: false,
		});
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
