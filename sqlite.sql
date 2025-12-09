-- SQLite schema converted from PostgreSQL schema.sql for Turso/libSQL.
-- 注意:
-- - ENUM を TEXT + CHECK に変換
-- - serial/bigserial を INTEGER PRIMARY KEY AUTOINCREMENT に変換
-- - jsonb を TEXT に変換
-- - text[] を TEXT(JSON 文字列) に変換
-- - uuid_generate_v7() などのデフォルトは削除（アプリ側で生成）
-- - スキーマ接頭辞 (public.) は削除
-- - トリガー/関数は削除し、アプリ側で updated_at を更新すること

PRAGMA foreign_keys = ON;

-- enums -> TEXT + CHECK
-- ContentKind: ('PAGE_COMMENT','PAGE')
-- NotificationType: ('FOLLOW','PAGE_COMMENT','PAGE_LIKE','PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE','PAGE_SEGMENT_TRANSLATION_VOTE')
-- PageStatus: ('PUBLIC','DRAFT','ARCHIVE')
-- SegmentTypeKey: ('COMMENTARY','PRIMARY')
-- TranslationProofStatus: ('HUMAN_TOUCHED','PROOFREAD','VALIDATED','MACHINE_DRAFT')
-- TranslationStatus: ('PENDING','IN_PROGRESS','FAILED','COMPLETED')

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  scope TEXT,
  id_token TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  password TEXT,
  refreshTokenExpiresAt TEXT,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  expires_at TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX accounts_provider_providerAccountId_key ON accounts(provider, providerAccountId);

CREATE TABLE contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('PAGE_COMMENT','PAGE')),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  import_file_id INTEGER,
  FOREIGN KEY (import_file_id) REFERENCES import_files(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX contents_kind_idx ON contents(kind);

CREATE TABLE follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  UNIQUE (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX follows_follower_id_idx ON follows(follower_id);
CREATE INDEX follows_following_id_idx ON follows(following_id);

CREATE TABLE gemini_api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key TEXT NOT NULL DEFAULT '',
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX gemini_api_keys_user_id_idx ON gemini_api_keys(user_id);
CREATE UNIQUE INDEX gemini_api_keys_user_id_key ON gemini_api_keys(user_id);

CREATE TABLE import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'RUNNING'
);

CREATE TABLE import_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_run_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  message TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (import_run_id) REFERENCES import_runs(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE like_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  guest_id TEXT,
  user_id TEXT,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX like_pages_page_id_idx ON like_pages(page_id);
CREATE INDEX like_pages_user_id_idx ON like_pages(user_id);
CREATE UNIQUE INDEX like_pages_guest_id_page_id_key ON like_pages(guest_id, page_id);
CREATE UNIQUE INDEX like_pages_user_id_page_id_key ON like_pages(user_id, page_id);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('FOLLOW','PAGE_COMMENT','PAGE_LIKE','PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE','PAGE_SEGMENT_TRANSLATION_VOTE')),
  read BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  actor_id TEXT NOT NULL,
  page_comment_id INTEGER,
  page_id INTEGER,
  segment_translation_id INTEGER,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (page_comment_id) REFERENCES page_comments(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (segment_translation_id) REFERENCES segment_translations(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX notifications_actor_id_idx ON notifications(actor_id);
CREATE INDEX notifications_user_id_idx ON notifications(user_id);

CREATE TABLE page_comments (
  id INTEGER PRIMARY KEY,
  page_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  locale TEXT NOT NULL,
  user_id TEXT NOT NULL,
  parent_id INTEGER,
  mdast_json TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT 0,
  last_reply_at TEXT,
  reply_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (id) REFERENCES contents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES page_comments(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX page_comments_page_id_parent_id_created_at_idx ON page_comments(page_id, parent_id, created_at);
CREATE INDEX page_comments_parent_id_is_deleted_created_at_idx ON page_comments(parent_id, is_deleted, created_at);
CREATE INDEX page_comments_user_id_idx ON page_comments(user_id);

CREATE TABLE page_locale_translation_proofs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  locale TEXT NOT NULL,
  translation_proof_status TEXT NOT NULL DEFAULT 'MACHINE_DRAFT' CHECK (translation_proof_status IN ('HUMAN_TOUCHED','PROOFREAD','VALIDATED','MACHINE_DRAFT')),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX page_locale_translation_proofs_translation_proof_status_idx ON page_locale_translation_proofs(translation_proof_status);
CREATE UNIQUE INDEX page_locale_translation_proofs_page_id_locale_key ON page_locale_translation_proofs(page_id, locale);

CREATE TABLE page_views (
  pageId INTEGER PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (pageId) REFERENCES pages(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE pages (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  source_locale TEXT NOT NULL DEFAULT 'unknown',
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLIC','DRAFT','ARCHIVE')),
  user_id TEXT NOT NULL,
  mdast_json TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  parent_id INTEGER,
  FOREIGN KEY (id) REFERENCES contents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX pages_created_at_idx ON pages(created_at);
CREATE INDEX pages_parent_id_idx ON pages(parent_id);
CREATE INDEX pages_parent_id_order_idx ON pages(parent_id, "order");
CREATE INDEX pages_slug_idx ON pages(slug);
CREATE INDEX pages_user_id_idx ON pages(user_id);
CREATE UNIQUE INDEX pages_slug_key ON pages(slug);

CREATE TABLE segment_annotation_links (
  main_segment_id INTEGER NOT NULL,
  annotation_segment_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (main_segment_id, annotation_segment_id),
  FOREIGN KEY (annotation_segment_id) REFERENCES segments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (main_segment_id) REFERENCES segments(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX segment_annotation_links_annotation_segment_id_idx ON segment_annotation_links(annotation_segment_id);
CREATE INDEX segment_annotation_links_main_segment_id_idx ON segment_annotation_links(main_segment_id);

CREATE TABLE segment_metadata_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  label TEXT NOT NULL
);
CREATE UNIQUE INDEX segment_metadata_types_key_key ON segment_metadata_types(key);

CREATE TABLE segment_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  metadata_type_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (metadata_type_id) REFERENCES segment_metadata_types(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX segment_metadata_metadata_type_id_idx ON segment_metadata(metadata_type_id);
CREATE INDEX segment_metadata_segment_id_idx ON segment_metadata(segment_id);
CREATE UNIQUE INDEX segment_metadata_segment_id_metadata_type_id_value_key ON segment_metadata(segment_id, metadata_type_id, value);

CREATE TABLE segment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  key TEXT NOT NULL CHECK (key IN ('COMMENTARY','PRIMARY'))
);
CREATE INDEX segment_types_key_idx ON segment_types(key);
CREATE INDEX segment_types_label_idx ON segment_types(label);
CREATE UNIQUE INDEX segment_types_key_label_key ON segment_types(key, label);

CREATE TABLE segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  text TEXT NOT NULL,
  text_and_occurrence_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  segment_type_id INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (segment_type_id) REFERENCES segment_types(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX segments_content_id_idx ON segments(content_id);
CREATE INDEX segments_text_and_occurrence_hash_idx ON segments(text_and_occurrence_hash);
CREATE UNIQUE INDEX segments_content_id_number_key ON segments(content_id, number);
CREATE UNIQUE INDEX segments_content_id_text_and_occurrence_hash_key ON segments(content_id, text_and_occurrence_hash);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  ipAddress TEXT,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  userAgent TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX sessions_sessionToken_key ON sessions(sessionToken);

CREATE TABLE tag_pages (
  tagId INTEGER NOT NULL,
  pageId INTEGER NOT NULL,
  PRIMARY KEY (tagId, pageId),
  FOREIGN KEY (pageId) REFERENCES pages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX tag_pages_pageId_idx ON tag_pages(pageId);
CREATE INDEX tag_pages_tagId_idx ON tag_pages(tagId);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE INDEX tags_name_idx ON tags(name);
CREATE UNIQUE INDEX tags_name_key ON tags(name);

CREATE TABLE translation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pageId INTEGER NOT NULL,
  userId TEXT,
  locale TEXT NOT NULL,
  aiModel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','FAILED','COMPLETED')),
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (pageId) REFERENCES pages(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX translation_jobs_userId_idx ON translation_jobs(userId);

CREATE TABLE translation_votes (
  translation_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  is_upvote BOOLEAN NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (translation_id, user_id),
  FOREIGN KEY (translation_id) REFERENCES segment_translations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX translation_votes_translation_id_idx ON translation_votes(translation_id);
CREATE INDEX translation_votes_user_id_idx ON translation_votes(user_id);

CREATE TABLE user_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  password TEXT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX user_credentials_user_id_idx ON user_credentials(user_id);
CREATE UNIQUE INDEX user_credentials_user_id_key ON user_credentials(user_id);

CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  target_locales TEXT NOT NULL DEFAULT '[]', -- JSON string
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX user_settings_user_id_key ON user_settings(user_id);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  image TEXT NOT NULL DEFAULT 'https://evame.tech/avatar.png',
  plan TEXT NOT NULL DEFAULT 'free',
  total_points INTEGER NOT NULL DEFAULT 0,
  is_ai BOOLEAN NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'Credentials',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  name TEXT NOT NULL DEFAULT 'new_user',
  handle TEXT NOT NULL,
  profile TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  twitterHandle TEXT NOT NULL DEFAULT '',
  emailVerified BOOLEAN
);
CREATE UNIQUE INDEX users_email_key ON users(email);
CREATE UNIQUE INDEX users_handle_key ON users(handle);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);
CREATE UNIQUE INDEX verification_tokens_token_key ON verification_tokens(token);

CREATE TABLE segment_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  point INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  user_id TEXT NOT NULL,
  FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX segment_translations_segment_id_locale_idx ON segment_translations(segment_id, locale);
CREATE INDEX segment_translations_user_id_idx ON segment_translations(user_id);
