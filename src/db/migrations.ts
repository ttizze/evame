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
				name TEXT NOT NULL DEFAULT 'new_user',
				handle TEXT NOT NULL UNIQUE,
				profile TEXT NOT NULL DEFAULT '',
				total_points INTEGER NOT NULL DEFAULT 0,
				is_ai INTEGER NOT NULL DEFAULT 0,
				image TEXT NOT NULL DEFAULT 'https://evame.tech/avatar.png',
				plan TEXT NOT NULL DEFAULT 'free',
				provider TEXT NOT NULL DEFAULT 'Credentials',
				twitter_handle TEXT NOT NULL DEFAULT '',
				email_verified INTEGER,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
			)`,
			`CREATE TABLE IF NOT EXISTS personal_access_tokens (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				key_hash TEXT NOT NULL UNIQUE,
				user_id TEXT NOT NULL,
				name TEXT NOT NULL DEFAULT '',
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				last_used_at TEXT,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS personal_access_tokens_user_id_idx ON personal_access_tokens (user_id)",
			`CREATE TABLE IF NOT EXISTS import_runs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				finished_at TEXT,
				status TEXT NOT NULL DEFAULT 'RUNNING'
			)`,
			`CREATE TABLE IF NOT EXISTS import_files (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				import_run_id INTEGER NOT NULL,
				path TEXT NOT NULL,
				checksum TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'PENDING',
				message TEXT NOT NULL DEFAULT '',
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (import_run_id) REFERENCES import_runs (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS import_files_import_run_id_idx ON import_files (import_run_id)",
			`CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY NOT NULL,
				user_id TEXT NOT NULL,
				token TEXT NOT NULL UNIQUE,
				expires_at TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				ip_address TEXT,
				user_agent TEXT,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)",
			"CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at)",
			`CREATE TABLE IF NOT EXISTS accounts (
				id TEXT PRIMARY KEY NOT NULL,
				user_id TEXT NOT NULL,
				provider_id TEXT NOT NULL,
				account_id TEXT NOT NULL,
				refresh_token TEXT,
				access_token TEXT,
				scope TEXT,
				id_token TEXT,
				password TEXT,
				refresh_token_expires_at TEXT,
				access_token_expires_at TEXT,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
				UNIQUE (provider_id, account_id)
			)`,
			"CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id)",
			`CREATE TABLE IF NOT EXISTS verifications (
				id TEXT PRIMARY KEY NOT NULL,
				identifier TEXT NOT NULL,
				value TEXT NOT NULL,
				expires_at TEXT NOT NULL,
				created_at TEXT,
				updated_at TEXT
			)`,
			"CREATE INDEX IF NOT EXISTS verifications_identifier_idx ON verifications (identifier)",
			`CREATE TABLE IF NOT EXISTS gemini_api_keys (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				api_key TEXT NOT NULL DEFAULT '',
				user_id TEXT NOT NULL UNIQUE,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS gemini_api_keys_user_id_idx ON gemini_api_keys (user_id)",
			`CREATE TABLE IF NOT EXISTS segment_types (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				label TEXT NOT NULL,
				key TEXT NOT NULL CHECK (key IN ('PRIMARY', 'COMMENTARY')),
				UNIQUE (key, label)
			)`,
			"CREATE INDEX IF NOT EXISTS segment_types_key_idx ON segment_types (key)",
			"CREATE INDEX IF NOT EXISTS segment_types_label_idx ON segment_types (label)",
			`CREATE TABLE IF NOT EXISTS scriptures (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				slug TEXT NOT NULL UNIQUE,
				title TEXT NOT NULL,
				source_locale TEXT NOT NULL,
				owner_user_id TEXT,
				import_file_id INTEGER,
				parent_id INTEGER,
				position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
				published_at TEXT,
				FOREIGN KEY (parent_id) REFERENCES scriptures (id) ON DELETE CASCADE,
				FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE SET NULL,
				FOREIGN KEY (import_file_id) REFERENCES import_files (id) ON DELETE SET NULL
			)`,
			"CREATE INDEX IF NOT EXISTS scriptures_parent_position_idx ON scriptures (parent_id, position, id)",
			"CREATE INDEX IF NOT EXISTS scriptures_owner_user_id_idx ON scriptures (owner_user_id)",
			"CREATE INDEX IF NOT EXISTS scriptures_import_file_id_idx ON scriptures (import_file_id)",
			`CREATE TABLE IF NOT EXISTS segments (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				scripture_id INTEGER NOT NULL,
				segment_type_id INTEGER NOT NULL,
				kind TEXT NOT NULL CHECK (kind IN ('PRIMARY', 'COMMENTARY')),
				position INTEGER NOT NULL CHECK (position >= 0),
				source_text TEXT NOT NULL,
				text_and_occurrence_hash TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (scripture_id) REFERENCES scriptures (id) ON DELETE CASCADE,
				FOREIGN KEY (segment_type_id) REFERENCES segment_types (id) ON DELETE RESTRICT
			)`,
			"CREATE INDEX IF NOT EXISTS segments_scripture_position_idx ON segments (scripture_id, position, id)",
			"CREATE INDEX IF NOT EXISTS segments_scripture_kind_idx ON segments (scripture_id, kind, position, id)",
			"CREATE INDEX IF NOT EXISTS segments_segment_type_id_idx ON segments (segment_type_id)",
			"CREATE INDEX IF NOT EXISTS segments_text_and_occurrence_hash_idx ON segments (text_and_occurrence_hash)",
			`CREATE TABLE IF NOT EXISTS like_pages (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				page_id INTEGER NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				user_id TEXT,
				UNIQUE (user_id, page_id),
				FOREIGN KEY (page_id) REFERENCES scriptures (id) ON DELETE CASCADE,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS like_pages_page_id_idx ON like_pages (page_id)",
			"CREATE INDEX IF NOT EXISTS like_pages_user_id_idx ON like_pages (user_id)",
			`CREATE TABLE IF NOT EXISTS notifications (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT NOT NULL,
				type TEXT NOT NULL CHECK (type IN ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE')),
				read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				actor_id TEXT NOT NULL,
				page_comment_id INTEGER,
				page_id INTEGER,
				segment_translation_id INTEGER,
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
				FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id)",
			"CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON notifications (actor_id)",
			`CREATE TABLE IF NOT EXISTS page_locale_translation_proofs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				page_id INTEGER NOT NULL,
				locale TEXT NOT NULL,
				translation_proof_status TEXT NOT NULL DEFAULT 'MACHINE_DRAFT'
					CHECK (translation_proof_status IN ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED')),
				UNIQUE (page_id, locale),
				FOREIGN KEY (page_id) REFERENCES scriptures (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS page_locale_translation_proofs_status_idx ON page_locale_translation_proofs (translation_proof_status)",
			`CREATE TABLE IF NOT EXISTS segment_metadata_types (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				key TEXT NOT NULL UNIQUE,
				label TEXT NOT NULL
			)`,
			`CREATE TABLE IF NOT EXISTS segment_metadata (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				segment_id INTEGER NOT NULL,
				metadata_type_id INTEGER NOT NULL,
				value TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				UNIQUE (segment_id, metadata_type_id, value),
				FOREIGN KEY (segment_id) REFERENCES segments (id) ON DELETE CASCADE,
				FOREIGN KEY (metadata_type_id) REFERENCES segment_metadata_types (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS segment_metadata_segment_id_idx ON segment_metadata (segment_id)",
			"CREATE INDEX IF NOT EXISTS segment_metadata_metadata_type_id_idx ON segment_metadata (metadata_type_id)",
			`CREATE TABLE IF NOT EXISTS tags (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL UNIQUE
			)`,
			"CREATE INDEX IF NOT EXISTS tags_name_idx ON tags (name)",
			`CREATE TABLE IF NOT EXISTS tag_pages (
				tag_id INTEGER NOT NULL,
				page_id INTEGER NOT NULL,
				PRIMARY KEY (tag_id, page_id),
				FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
				FOREIGN KEY (page_id) REFERENCES scriptures (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS tag_pages_tag_id_idx ON tag_pages (tag_id)",
			"CREATE INDEX IF NOT EXISTS tag_pages_page_id_idx ON tag_pages (page_id)",
			`CREATE TABLE IF NOT EXISTS translation_contexts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT NOT NULL,
				name TEXT NOT NULL,
				context TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS translation_contexts_user_id_idx ON translation_contexts (user_id)",
			`CREATE TABLE IF NOT EXISTS page_views (
				page_id INTEGER PRIMARY KEY NOT NULL,
				count INTEGER NOT NULL DEFAULT 0,
				FOREIGN KEY (page_id) REFERENCES scriptures (id) ON DELETE CASCADE
			)`,
			`CREATE TABLE IF NOT EXISTS user_settings (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT NOT NULL UNIQUE,
				target_locales TEXT NOT NULL DEFAULT '["RAY"]',
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
			)`,
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
	{
		id: "0002_translation_job_chunks",
		statements: [
			`CREATE TABLE IF NOT EXISTS translation_job_chunks (
				job_id TEXT NOT NULL,
				chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
				status TEXT NOT NULL DEFAULT 'PENDING'
					CHECK (status IN ('PENDING', 'ENQUEUING', 'ENQUEUED', 'PROCESSING', 'COMPLETED')),
				lease_until TEXT,
				lease_token TEXT,
				enqueue_attempts INTEGER NOT NULL DEFAULT 0 CHECK (enqueue_attempts >= 0),
				processing_attempts INTEGER NOT NULL DEFAULT 0 CHECK (processing_attempts >= 0),
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				PRIMARY KEY (job_id, chunk_index),
				FOREIGN KEY (job_id) REFERENCES translation_jobs (id) ON DELETE CASCADE
			)`,
			"CREATE INDEX IF NOT EXISTS translation_job_chunks_lease_idx ON translation_job_chunks (status, lease_until)",
		],
	},
	{
		id: "0003_translation_job_context",
		statements: [
			"ALTER TABLE translation_jobs ADD COLUMN translation_context TEXT NOT NULL DEFAULT ''",
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
