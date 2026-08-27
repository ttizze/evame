import type { SqlExecutor } from "./turso-types";

export const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
	id TEXT PRIMARY KEY NOT NULL,
	applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

export const migrations = [
	{
		id: "0001_initial",
		statements: [
			"PRAGMA foreign_keys = ON",
			`CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY NOT NULL,
				email TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
			)`,
			`CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY NOT NULL,
				user_id TEXT NOT NULL,
				token_hash TEXT NOT NULL UNIQUE,
				expires_at TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)",
			"CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)",
			`CREATE TABLE IF NOT EXISTS magic_link_tokens (
				id TEXT PRIMARY KEY NOT NULL,
				email TEXT NOT NULL,
				token_hash TEXT NOT NULL UNIQUE,
				expires_at TEXT NOT NULL,
				used_at TEXT,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				request_ip_hash TEXT NOT NULL
			)`,
			"CREATE INDEX IF NOT EXISTS magic_link_tokens_expires_at_idx ON magic_link_tokens (expires_at)",
			"CREATE INDEX IF NOT EXISTS magic_link_tokens_email_idx ON magic_link_tokens (email)",
			`CREATE TABLE IF NOT EXISTS scriptures (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				slug TEXT NOT NULL UNIQUE,
				title TEXT NOT NULL,
				source_locale TEXT NOT NULL,
				owner_user_id TEXT,
				parent_id INTEGER,
				position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
				published_at TEXT,
				FOREIGN KEY (parent_id) REFERENCES scriptures (id) ON DELETE CASCADE,
				FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE SET NULL
			)`,
			"CREATE INDEX IF NOT EXISTS scriptures_parent_position_idx ON scriptures (parent_id, position, id)",
			"CREATE INDEX IF NOT EXISTS scriptures_owner_user_id_idx ON scriptures (owner_user_id)",
			`CREATE TABLE IF NOT EXISTS segments (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				scripture_id INTEGER NOT NULL,
				kind TEXT NOT NULL CHECK (kind IN ('PRIMARY', 'COMMENTARY')),
				position INTEGER NOT NULL CHECK (position >= 0),
				source_text TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (scripture_id) REFERENCES scriptures (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS segments_scripture_position_idx ON segments (scripture_id, position, id)",
			"CREATE INDEX IF NOT EXISTS segments_scripture_kind_idx ON segments (scripture_id, kind, position, id)",
			`CREATE TABLE IF NOT EXISTS segment_annotation_links (
				main_segment_id INTEGER NOT NULL,
				annotation_segment_id INTEGER NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				PRIMARY KEY (main_segment_id, annotation_segment_id),
				CHECK (main_segment_id <> annotation_segment_id),
				FOREIGN KEY (main_segment_id) REFERENCES segments (id) ON DELETE CASCADE,
				FOREIGN KEY (annotation_segment_id) REFERENCES segments (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS segment_annotation_links_annotation_idx ON segment_annotation_links (annotation_segment_id)",
			`CREATE TABLE IF NOT EXISTS translation_jobs (
				id TEXT PRIMARY KEY NOT NULL,
				scripture_id INTEGER,
				locale TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'PENDING'
					CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
				progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
				total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),
				error TEXT NOT NULL DEFAULT '',
				model TEXT NOT NULL,
				requested_by TEXT,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (scripture_id) REFERENCES scriptures (id) ON DELETE SET NULL,
				FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE SET NULL
			)`,
			"CREATE INDEX IF NOT EXISTS translation_jobs_scripture_locale_idx ON translation_jobs (scripture_id, locale)",
			"CREATE INDEX IF NOT EXISTS translation_jobs_requested_by_idx ON translation_jobs (requested_by, created_at DESC, id DESC)",
			`CREATE TABLE IF NOT EXISTS translations (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				segment_id INTEGER NOT NULL,
				locale TEXT NOT NULL,
				text TEXT NOT NULL,
				point INTEGER NOT NULL DEFAULT 0,
				user_id TEXT NOT NULL,
				source TEXT NOT NULL DEFAULT 'USER' CHECK (source IN ('USER', 'AI')),
				ai_job_id TEXT,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				CHECK (length(trim(locale)) > 0),
				CHECK (length(trim(text)) > 0),
				FOREIGN KEY (segment_id) REFERENCES segments (id) ON DELETE CASCADE,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
				FOREIGN KEY (ai_job_id) REFERENCES translation_jobs (id) ON DELETE SET NULL
			)`,
			"CREATE INDEX IF NOT EXISTS translations_segment_locale_rank_idx ON translations (segment_id, locale, point DESC, created_at DESC, id DESC)",
			"CREATE INDEX IF NOT EXISTS translations_user_id_idx ON translations (user_id)",
			"CREATE INDEX IF NOT EXISTS translations_ai_job_id_idx ON translations (ai_job_id)",
			`CREATE TABLE IF NOT EXISTS translation_votes (
				translation_id INTEGER NOT NULL,
				user_id TEXT NOT NULL,
				is_upvote INTEGER NOT NULL CHECK (is_upvote IN (0, 1)),
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				PRIMARY KEY (translation_id, user_id),
				FOREIGN KEY (translation_id) REFERENCES translations (id) ON DELETE CASCADE,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS translation_votes_user_id_idx ON translation_votes (user_id)",
		],
	},
] as const;

export async function migrateDatabase(db: {
	run(sql: string, args?: readonly unknown[]): Promise<unknown>;
	all<T>(sql: string, args?: readonly unknown[]): Promise<T[]>;
	transaction<T>(
		callback: (transaction: SqlExecutor) => Promise<T>,
	): Promise<T>;
}): Promise<void> {
	await db.run(MIGRATION_TABLE_SQL);
	await db.transaction(async (transaction) => {
		const applied = await transaction.all<{ id: string }>(
			"SELECT id FROM schema_migrations",
		);
		const appliedIds = new Set(applied.map(({ id }) => id));

		for (const migration of migrations) {
			if (appliedIds.has(migration.id)) continue;
			for (const statement of migration.statements) {
				await transaction.run(statement);
			}
			await transaction.run("INSERT INTO schema_migrations (id) VALUES (?)", [
				migration.id,
			]);
		}
	});
}
