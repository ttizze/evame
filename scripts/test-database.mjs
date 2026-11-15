import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

export async function prepareTestDatabase(path, seeded) {
	await mkdir(dirname(path), { recursive: true });
	// 既存の検証DBや配布元を再利用して書き換えない。
	const file = await open(path, "wx");
	await file.close();
	const database = createClient({ url: `file:${resolve(path)}` });
	try {
		await migrate(drizzle(database), { migrationsFolder: "./src/drizzle" });
	} finally {
		database.close();
	}
	if (seeded)
		execFileSync("bun", ["src/db/seed.ts"], {
			env: {
				...process.env,
				TURSO_DATABASE_URL: `file:${resolve(path)}`,
				TURSO_AUTH_TOKEN: "",
				SENTRY_DSN: "",
				VITE_SENTRY_DSN: "",
			},
			stdio: "pipe",
		});
	const completed = createClient({ url: `file:${resolve(path)}` });
	try {
		await completed.execute("PRAGMA wal_checkpoint(TRUNCATE)");
		await completed.execute("PRAGMA journal_mode=DELETE");
	} finally {
		completed.close();
	}
}

export async function copyTestDatabase(path) {
	const template = process.env.EVAME_TEST_DATABASE_TEMPLATE;
	if (template) await copyFile(template, path, constants.COPYFILE_EXCL);
	else await prepareTestDatabase(path, true);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const target = process.argv[2];
	if (!target) throw new Error("A test SQLite output path is required");
	const temporary = `${target}.${randomUUID()}.db`;
	try {
		await prepareTestDatabase(temporary, true);
		await rename(temporary, target);
	} finally {
		for (const suffix of ["", "-wal", "-shm", "-journal"])
			await rm(temporary + suffix, { force: true });
	}
}
