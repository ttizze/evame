import { createHash } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { disposeDb } from "@/db";

export async function setupDbPerFile(fileUrl: string): Promise<void> {
	await disposeDb();
	const id = createHash("sha256").update(fileUrl).digest("hex").slice(0, 12);
	const directory = resolve(".data/tests");
	await mkdir(directory, { recursive: true });
	const path = resolve(directory, `${process.pid}-${id}.db`);
	for (const suffix of ["", "-wal", "-shm"])
		await rm(path + suffix, { force: true });
	process.env.TURSO_DATABASE_URL = `file:${path}`;
	process.env.TURSO_AUTH_TOKEN = "";
	const client = createClient({ url: process.env.TURSO_DATABASE_URL });
	try {
		await migrate(drizzle(client), { migrationsFolder: "./src/drizzle" });
		await client.execute("PRAGMA journal_mode=WAL");
	} finally {
		client.close();
	}
}
