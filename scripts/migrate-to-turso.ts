// Postgres(DB_URL) のデータを SQLite ファイルへ移行するスクリプト
// 前提: SQLite 側のスキーマは sqlite.sql 等で事前に作成済み
// 用途: pg_dump(.bak) をリストアした Postgres → SQLite/Turso 互換 DB 作成

import Database from "better-sqlite3";
import { Client } from "pg";

const SOURCE_PG =
	process.env.DATABASE_URL ??
	"postgres://postgres:postgres@db.localtest.me:5434/main";
const DEST_SQLITE = process.env.DEST_SQLITE_PATH ?? "evam.db";
const BATCH_SIZE = Number(process.env.MIGRATE_BATCH_SIZE ?? 500);

// FK を尊重した移行順
const TABLES = [
	"users",
	"import_runs",
	"import_files",
	"contents",
	"segment_types",
	"pages",
	"page_views",
	"page_locale_translation_proofs",
	"segments",
	"segment_annotation_links",
	"segment_metadata_types",
	"segment_metadata",
	"segment_translations",
	"translation_votes",
	"tags",
	"tag_pages",
	"page_comments",
	"notifications",
	"like_pages",
	"follows",
	"gemini_api_keys",
	"translation_jobs",
	"user_credentials",
	"user_settings",
	"sessions",
	"accounts",
	"verification",
	"verification_tokens",
];

// 行配列を指定サイズに分割するためのユーティリティ
function chunk<T>(rows: T[], size: number): T[][] {
	const buckets: T[][] = [];
	for (let i = 0; i < rows.length; i += size) {
		buckets.push(rows.slice(i, i + size));
	}
	return buckets;
}

// 値を型変換して整形する
function normalizeRow(table: string, row: Record<string, unknown>) {
	const coerceScalar = (value: unknown) => {
		if (value === null || value === undefined) return null;
		if (typeof value === "boolean") return value ? 1 : 0;
		if (value instanceof Date) return value.toISOString();
		if (Buffer.isBuffer(value)) return value; // better-sqlite3 OK
		if (typeof value === "object") return JSON.stringify(value);
		return value;
	};

	const jsonString = (value: unknown) => {
		if (typeof value === "string") return value;
		return JSON.stringify(value ?? null);
	};
	const arrayToJson = (value: unknown) => {
		if (Array.isArray(value)) return JSON.stringify(value);
		if (typeof value === "string") return value;
		return "[]";
	};

	const transformed =
		table === "page_comments" || table === "pages"
			? { ...row, mdast_json: jsonString(row.mdast_json) }
			: table === "user_settings"
				? { ...row, target_locales: arrayToJson(row.target_locales) }
				: row;

	return Object.fromEntries(
		Object.entries(transformed).map(([key, value]) => {
			return [key, coerceScalar(value)];
		}),
	);
}

async function fetchRows(pg: Client, table: string) {
	const res = await pg.query(`SELECT * FROM "${table}"`);
	return res.rows as Record<string, unknown>[];
}

function insertRows(
	sqlite: Database.Database,
	table: string,
	rows: Record<string, unknown>[],
) {
	if (rows.length === 0) {
		console.log(`skip ${table}: no rows`);
		return;
	}

	const cols = Object.keys(rows[0]);
	const placeholders = cols.map(() => "?").join(",");
	const colList = cols.map((c) => `"${c}"`).join(",");
	const stmt = sqlite.prepare(
		`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
	);
	const runMany = sqlite.transaction((batch: Record<string, unknown>[]) => {
		for (const row of batch) {
			const args = cols.map((col) => row[col]);
			stmt.run(...args);
		}
	});

	const batches = chunk(rows, BATCH_SIZE);
	for (const batch of batches) {
		runMany(batch);
	}
	console.log(`done ${table}: ${rows.length} rows`);
}

async function main() {
	console.log(`source(Postgres): ${SOURCE_PG}`);
	console.log(`dest(SQLite): ${DEST_SQLITE}`);

	const pg = new Client({ connectionString: SOURCE_PG });
	await pg.connect();

	const sqlite = new Database(DEST_SQLITE);
	sqlite.pragma("foreign_keys = OFF");
	sqlite.pragma("journal_mode = WAL");
	sqlite.pragma("synchronous = OFF");

	try {
		for (const table of TABLES) {
			console.log(`migrating ${table}...`);
			const rows = await fetchRows(pg, table);
			const normalized = rows.map((r) => normalizeRow(table, r));
			insertRows(sqlite, table, normalized);
		}
	} finally {
		sqlite.pragma("foreign_keys = ON");
		pg.end();
		sqlite.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
