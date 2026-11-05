import "dotenv/config";
import { createHash } from "node:crypto";
import { chmod, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient, type InStatement, type ResultSet } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { Client, types } from "pg";
import { searchColumns } from "../src/db/search-values-plugin";
import { encodeTursoValue } from "../src/db/turso-value-codec";
import * as schema from "../src/drizzle/schema";

// 本番DBは読み取り専用の一貫したスナップショットを使い、未公開のローカルDBへコピーする。
process.umask(0o077);
const sourceUrl = process.env.POSTGRES_SOURCE_URL;
const targetPath = process.argv[2];
if (!sourceUrl || !targetPath?.endsWith(".db")) {
	throw new Error("Set POSTGRES_SOURCE_URL and supply a new local .db path");
}
const path = resolve(targetPath);
await mkdir(dirname(path), { recursive: true, mode: 0o700 });
const source = new Client({
	connectionString: sourceUrl,
	types: {
		getTypeParser(oid, format) {
			// PostgreSQLのtimestamp without time zoneも既存Workersと同じUTCで解釈する。
			return oid === 1114
				? (value: string) => new Date(`${value.replace(" ", "T")}Z`)
				: types.getTypeParser(oid, format);
		},
	},
});
let sourceConnected = false;
const target = createClient({ url: `file:${path}`, concurrency: 1 });
await chmod(path, 0o600);
try {
	await migrate(drizzle(target), { migrationsFolder: "./src/drizzle" });
	const tables = Object.values(schema).map(getTableConfig);
	for (const table of tables) {
		const existing = await target.execute(
			`SELECT count(*) AS count FROM "${table.name}"`,
		);
		if (Number(existing.rows[0].count))
			throw new Error("Target database must be empty");
	}
	await source.connect();
	sourceConnected = true;
	await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
	await source.query("SET LOCAL TIME ZONE 'UTC'");
	for (const table of tables) {
		const columns = table.columns;
		const search = searchColumns[table.name];
		const sourceNames = columns
			.filter((column) => column.name !== search?.stored)
			.map((column) => `"${column.name}"`)
			.join(", ");
		const names = columns.map((column) => `"${column.name}"`).join(", ");
		const primary = [
			...columns.filter((column) => column.primary),
			...table.primaryKeys.flatMap((key) => key.columns),
		];
		const keys = primary.length
			? primary.map((column) => column.name)
			: table.name === "translation_votes"
				? ["translation_id", "user_id"]
				: [];
		if (!keys.length)
			throw new Error(`Missing export ordering for ${table.name}`);
		const ordering = keys.map((key) => `"${key}"`).join(", ");
		const checksum = createHash("sha256");
		let count = 0;
		await source.query(
			`DECLARE transfer_cursor NO SCROLL CURSOR FOR SELECT ${sourceNames} FROM "${table.name}" ORDER BY ${ordering}`,
		);
		while (true) {
			const batch = await source.query(
				"FETCH FORWARD 500 FROM transfer_cursor",
			);
			if (!batch.rows.length) break;
			const statements: InStatement[] = batch.rows.map((row) => {
				const args = columns.map((column) => {
					const value =
						column.name === search?.stored
							? row[search.source].toLowerCase()
							: row[column.name];
					if (value === null) return null;
					if (column.name === "target_locales")
						return encodeTursoValue("stringArray", value);
					if (column.dataType === "date")
						return encodeTursoValue("timestamp", value);
					if (column.dataType === "boolean")
						return encodeTursoValue("boolean", value);
					if (column.dataType === "json")
						return encodeTursoValue("json", value);
					return value;
				});
				checksum.update(`${JSON.stringify(args)}\n`);
				return {
					sql: `INSERT INTO "${table.name}" (${names}) VALUES (${columns.map(() => "?").join(", ")})`,
					args,
				};
			});
			// インポート途中の親子関係は最終 foreign_key_check で全件検証する。
			await target.migrate(statements);
			count += batch.rows.length;
		}
		await source.query("CLOSE transfer_cursor");
		const targetChecksum = createHash("sha256");
		let verified = 0;
		let lastKeys: Array<string | number | bigint | null> | null = null;
		while (true) {
			const condition: string = lastKeys
				? `WHERE (${ordering}) > (${keys.map(() => "?").join(", ")})`
				: "";
			const batch: ResultSet = await target.execute({
				sql: `SELECT ${names} FROM "${table.name}" ${condition} ORDER BY ${ordering} LIMIT 500`,
				args: lastKeys ?? [],
			});
			if (!batch.rows.length) break;
			for (const row of batch.rows)
				targetChecksum.update(
					`${JSON.stringify(columns.map((column) => row[column.name]))}\n`,
				);
			const last = batch.rows[batch.rows.length - 1];
			lastKeys = keys.map(
				(key) => last[key] as string | number | bigint | null,
			);
			verified += batch.rows.length;
		}
		if (
			verified !== count ||
			targetChecksum.digest("hex") !== checksum.digest("hex")
		)
			throw new Error(`Data verification failed for ${table.name}`);
		console.log(`${table.name}: ${count} rows verified`);
	}
	const violations = await target.execute("PRAGMA foreign_key_check");
	if (violations.rows.length)
		throw new Error("Imported database has foreign key violations");
	const integrity = await target.execute("PRAGMA integrity_check");
	if (integrity.rows[0].integrity_check !== "ok")
		throw new Error("Imported database failed integrity check");
	for (const [setting, expected] of [
		["page_size", 4096],
		["auto_vacuum", 0],
		["encoding", "UTF-8"],
	] as const) {
		const result = await target.execute(`PRAGMA ${setting}`);
		if (result.rows[0][setting] !== expected)
			throw new Error(`Invalid Turso upload setting: ${setting}`);
	}
	await target.execute("PRAGMA journal_mode=WAL");
	await target.execute("PRAGMA wal_checkpoint(TRUNCATE)");
	await source.query("COMMIT");
	console.log("All rows, foreign keys and database integrity verified");
} catch (error) {
	if (sourceConnected) await source.query("ROLLBACK").catch(() => {});
	console.error(
		"Migration failed; the PostgreSQL source was left unchanged.",
		error instanceof Error && "code" in error
			? String(error.code)
			: "verification error",
	);
	process.exitCode = 1;
} finally {
	target.close();
	await source.end();
}
