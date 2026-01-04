-- Create enum type "page_status"
CREATE TYPE "page_status" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVE');
-- Create enum type "segment_type_key"
CREATE TYPE "segment_type_key" AS ENUM ('PRIMARY', 'COMMENTARY');
-- Create enum type "translation_proof_status"
CREATE TYPE "translation_proof_status" AS ENUM ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED');
-- Create enum type "translation_status"
CREATE TYPE "translation_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
-- Create enum type "content_kind"
CREATE TYPE "content_kind" AS ENUM ('PAGE', 'PAGE_COMMENT');
-- Create "users" table
CREATE TABLE "users" (
  "image" text NOT NULL DEFAULT 'https://evame.tech/avatar.png',
  "plan" text NOT NULL DEFAULT 'free',
  "total_points" integer NOT NULL DEFAULT 0,
  "is_ai" boolean NOT NULL DEFAULT false,
  "provider" text NOT NULL DEFAULT 'Credentials',
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" text NOT NULL DEFAULT 'new_user',
  "handle" text NOT NULL,
  "profile" text NOT NULL DEFAULT '',
  "id" text NOT NULL,
  "email" text NOT NULL,
  "twitter_handle" text NOT NULL DEFAULT '',
  "email_verified" boolean NULL,
  PRIMARY KEY ("id")
);
-- Create index "users_email_key" to table: "users"
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
-- Create index "users_handle_key" to table: "users"
CREATE UNIQUE INDEX "users_handle_key" ON "users" ("handle");
-- Create "verifications" table
CREATE TABLE "verifications" (
  "id" text NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp(3) NOT NULL,
  "created_at" timestamp(3) NULL,
  "updated_at" timestamp(3) NULL,
  PRIMARY KEY ("id")
);
-- Create enum type "notification_type"
CREATE TYPE "notification_type" AS ENUM ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE');
-- Create "accounts" table
CREATE TABLE "accounts" (
  "user_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "account_id" text NOT NULL,
  "refresh_token" text NULL,
  "access_token" text NULL,
  "scope" text NULL,
  "id_token" text NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id" text NOT NULL,
  "password" text NULL,
  "refresh_token_expires_at" timestamp(3) NULL,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "access_token_expires_at" timestamp(3) NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "accounts_provider_accountId_key" to table: "accounts"
CREATE UNIQUE INDEX "accounts_provider_accountId_key" ON "accounts" ("provider_id", "account_id");
-- Create "import_runs" table
CREATE TABLE "import_runs" (
  "id" serial NOT NULL,
  "started_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" timestamp(3) NULL,
  "status" text NOT NULL DEFAULT 'RUNNING',
  PRIMARY KEY ("id")
);
-- Create "import_files" table
CREATE TABLE "import_files" (
  "id" serial NOT NULL,
  "import_run_id" integer NOT NULL,
  "path" text NOT NULL,
  "checksum" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "message" text NOT NULL DEFAULT '',
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "import_files_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "contents" table
CREATE TABLE "contents" (
  "id" serial NOT NULL,
  "kind" "content_kind" NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "import_file_id" integer NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "contents_import_file_id_fkey" FOREIGN KEY ("import_file_id") REFERENCES "import_files" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "contents_kind_idx" to table: "contents"
CREATE INDEX "contents_kind_idx" ON "contents" ("kind");
-- Create "follows" table
CREATE TABLE "follows" (
  "id" serial NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "follower_id" text NOT NULL,
  "following_id" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id"),
  CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "follows_follower_id_idx" to table: "follows"
CREATE INDEX "follows_follower_id_idx" ON "follows" ("follower_id");
-- Create index "follows_following_id_idx" to table: "follows"
CREATE INDEX "follows_following_id_idx" ON "follows" ("following_id");
-- Create "gemini_api_keys" table
CREATE TABLE "gemini_api_keys" (
  "id" serial NOT NULL,
  "api_key" text NOT NULL DEFAULT '',
  "user_id" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "gemini_api_keys_user_id_idx" to table: "gemini_api_keys"
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys" ("user_id");
-- Create index "gemini_api_keys_user_id_key" to table: "gemini_api_keys"
CREATE UNIQUE INDEX "gemini_api_keys_user_id_key" ON "gemini_api_keys" ("user_id");
-- Create "pages" table
CREATE TABLE "pages" (
  "id" integer NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source_locale" text NOT NULL DEFAULT 'unknown',
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "page_status" NOT NULL DEFAULT 'DRAFT',
  "user_id" text NOT NULL,
  "mdast_json" jsonb NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  "parent_id" integer NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "pages_id_fkey" FOREIGN KEY ("id") REFERENCES "contents" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "pages_created_at_idx" to table: "pages"
CREATE INDEX "pages_created_at_idx" ON "pages" ("created_at");
-- Create index "pages_parent_id_idx" to table: "pages"
CREATE INDEX "pages_parent_id_idx" ON "pages" ("parent_id");
-- Create index "pages_parent_id_order_idx" to table: "pages"
CREATE INDEX "pages_parent_id_order_idx" ON "pages" ("parent_id", "order");
-- Create index "pages_slug_idx" to table: "pages"
CREATE INDEX "pages_slug_idx" ON "pages" ("slug");
-- Create index "pages_slug_key" to table: "pages"
CREATE UNIQUE INDEX "pages_slug_key" ON "pages" ("slug");
-- Create index "pages_user_id_idx" to table: "pages"
CREATE INDEX "pages_user_id_idx" ON "pages" ("user_id");
-- Create "like_pages" table
CREATE TABLE "like_pages" (
  "id" serial NOT NULL,
  "page_id" integer NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "like_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "like_pages_page_id_idx" to table: "like_pages"
CREATE INDEX "like_pages_page_id_idx" ON "like_pages" ("page_id");
-- Create index "like_pages_user_id_idx" to table: "like_pages"
CREATE INDEX "like_pages_user_id_idx" ON "like_pages" ("user_id");
-- Create index "like_pages_user_id_page_id_key" to table: "like_pages"
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages" ("user_id", "page_id");
-- Create "page_comments" table
CREATE TABLE "page_comments" (
  "id" integer NOT NULL,
  "page_id" integer NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locale" text NOT NULL,
  "user_id" text NOT NULL,
  "parent_id" integer NULL,
  "mdast_json" jsonb NOT NULL,
  "is_deleted" boolean NOT NULL DEFAULT false,
  "last_reply_at" timestamp(3) NULL,
  "reply_count" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id"),
  CONSTRAINT "page_comments_id_fkey" FOREIGN KEY ("id") REFERENCES "contents" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "page_comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "page_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "page_comments" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "page_comments_page_id_parent_id_created_at_idx" to table: "page_comments"
CREATE INDEX "page_comments_page_id_parent_id_created_at_idx" ON "page_comments" ("page_id", "parent_id", "created_at");
-- Create index "page_comments_parent_id_is_deleted_created_at_idx" to table: "page_comments"
CREATE INDEX "page_comments_parent_id_is_deleted_created_at_idx" ON "page_comments" ("parent_id", "is_deleted", "created_at");
-- Create index "page_comments_user_id_idx" to table: "page_comments"
CREATE INDEX "page_comments_user_id_idx" ON "page_comments" ("user_id");
-- Create "segment_types" table
CREATE TABLE "segment_types" (
  "id" serial NOT NULL,
  "label" text NOT NULL,
  "key" "segment_type_key" NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "segment_types_key_idx" to table: "segment_types"
CREATE INDEX "segment_types_key_idx" ON "segment_types" ("key");
-- Create index "segment_types_key_label_key" to table: "segment_types"
CREATE UNIQUE INDEX "segment_types_key_label_key" ON "segment_types" ("key", "label");
-- Create index "segment_types_label_idx" to table: "segment_types"
CREATE INDEX "segment_types_label_idx" ON "segment_types" ("label");
-- Create "segments" table
CREATE TABLE "segments" (
  "id" serial NOT NULL,
  "content_id" integer NOT NULL,
  "number" integer NOT NULL,
  "text" text NOT NULL,
  "text_and_occurrence_hash" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "segment_type_id" integer NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "segments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "segments_segment_type_id_fkey" FOREIGN KEY ("segment_type_id") REFERENCES "segment_types" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "segments_content_id_idx" to table: "segments"
CREATE INDEX "segments_content_id_idx" ON "segments" ("content_id");
-- Create index "segments_content_id_number_key" to table: "segments"
CREATE UNIQUE INDEX "segments_content_id_number_key" ON "segments" ("content_id", "number");
-- Create index "segments_content_id_text_and_occurrence_hash_key" to table: "segments"
CREATE UNIQUE INDEX "segments_content_id_text_and_occurrence_hash_key" ON "segments" ("content_id", "text_and_occurrence_hash");
-- Create index "segments_text_and_occurrence_hash_idx" to table: "segments"
CREATE INDEX "segments_text_and_occurrence_hash_idx" ON "segments" ("text_and_occurrence_hash");
-- Create "segment_translations" table
CREATE TABLE "segment_translations" (
  "id" serial NOT NULL,
  "segment_id" integer NOT NULL,
  "locale" text NOT NULL,
  "text" text NOT NULL,
  "point" integer NOT NULL DEFAULT 0,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "segment_translations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "segment_translations_segment_id_locale_idx" to table: "segment_translations"
CREATE INDEX "segment_translations_segment_id_locale_idx" ON "segment_translations" ("segment_id", "locale");
-- Create index "segment_translations_user_id_idx" to table: "segment_translations"
CREATE INDEX "segment_translations_user_id_idx" ON "segment_translations" ("user_id");
-- Create "notifications" table
CREATE TABLE "notifications" (
  "id" serial NOT NULL,
  "user_id" text NOT NULL,
  "type" "notification_type" NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_id" text NOT NULL,
  "page_comment_id" integer NULL,
  "page_id" integer NULL,
  "segment_translation_id" integer NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "notifications_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "notifications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "notifications_segment_translation_id_fkey" FOREIGN KEY ("segment_translation_id") REFERENCES "segment_translations" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "notifications_actor_id_idx" to table: "notifications"
CREATE INDEX "notifications_actor_id_idx" ON "notifications" ("actor_id");
-- Create index "notifications_user_id_idx" to table: "notifications"
CREATE INDEX "notifications_user_id_idx" ON "notifications" ("user_id");
-- Create "page_locale_translation_proofs" table
CREATE TABLE "page_locale_translation_proofs" (
  "id" serial NOT NULL,
  "page_id" integer NOT NULL,
  "locale" text NOT NULL,
  "translation_proof_status" "translation_proof_status" NOT NULL DEFAULT 'MACHINE_DRAFT',
  PRIMARY KEY ("id"),
  CONSTRAINT "page_locale_translation_proofs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "page_locale_translation_proofs_page_id_locale_key" to table: "page_locale_translation_proofs"
CREATE UNIQUE INDEX "page_locale_translation_proofs_page_id_locale_key" ON "page_locale_translation_proofs" ("page_id", "locale");
-- Create index "page_locale_translation_proofs_translation_proof_status_idx" to table: "page_locale_translation_proofs"
CREATE INDEX "page_locale_translation_proofs_translation_proof_status_idx" ON "page_locale_translation_proofs" ("translation_proof_status");
-- Create "page_views" table
CREATE TABLE "page_views" (
  "page_id" integer NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("page_id"),
  CONSTRAINT "page_views_pageId_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create "segment_annotation_links" table
CREATE TABLE "segment_annotation_links" (
  "main_segment_id" integer NOT NULL,
  "annotation_segment_id" integer NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("main_segment_id", "annotation_segment_id"),
  CONSTRAINT "segment_annotation_links_annotation_segment_id_fkey" FOREIGN KEY ("annotation_segment_id") REFERENCES "segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "segment_annotation_links_main_segment_id_fkey" FOREIGN KEY ("main_segment_id") REFERENCES "segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "segment_annotation_links_annotation_segment_id_idx" to table: "segment_annotation_links"
CREATE INDEX "segment_annotation_links_annotation_segment_id_idx" ON "segment_annotation_links" ("annotation_segment_id");
-- Create index "segment_annotation_links_main_segment_id_idx" to table: "segment_annotation_links"
CREATE INDEX "segment_annotation_links_main_segment_id_idx" ON "segment_annotation_links" ("main_segment_id");
-- Create "segment_metadata_types" table
CREATE TABLE "segment_metadata_types" (
  "id" serial NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "segment_metadata_types_key_key" to table: "segment_metadata_types"
CREATE UNIQUE INDEX "segment_metadata_types_key_key" ON "segment_metadata_types" ("key");
-- Create "segment_metadata" table
CREATE TABLE "segment_metadata" (
  "id" serial NOT NULL,
  "segment_id" integer NOT NULL,
  "metadata_type_id" integer NOT NULL,
  "value" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "segment_metadata_metadata_type_id_fkey" FOREIGN KEY ("metadata_type_id") REFERENCES "segment_metadata_types" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "segment_metadata_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "segment_metadata_metadata_type_id_idx" to table: "segment_metadata"
CREATE INDEX "segment_metadata_metadata_type_id_idx" ON "segment_metadata" ("metadata_type_id");
-- Create index "segment_metadata_segment_id_idx" to table: "segment_metadata"
CREATE INDEX "segment_metadata_segment_id_idx" ON "segment_metadata" ("segment_id");
-- Create index "segment_metadata_segment_id_metadata_type_id_value_key" to table: "segment_metadata"
CREATE UNIQUE INDEX "segment_metadata_segment_id_metadata_type_id_value_key" ON "segment_metadata" ("segment_id", "metadata_type_id", "value");
-- Create "sessions" table
CREATE TABLE "sessions" (
  "token" text NOT NULL,
  "user_id" text NOT NULL,
  "expires_at" timestamp(3) NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id" text NOT NULL,
  "ip_address" text NULL,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_agent" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "sessions_token_key" to table: "sessions"
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" ("token");
-- Create "tags" table
CREATE TABLE "tags" (
  "id" serial NOT NULL,
  "name" text NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "tags_name_idx" to table: "tags"
CREATE INDEX "tags_name_idx" ON "tags" ("name");
-- Create index "tags_name_key" to table: "tags"
CREATE UNIQUE INDEX "tags_name_key" ON "tags" ("name");
-- Create "tag_pages" table
CREATE TABLE "tag_pages" (
  "tag_id" integer NOT NULL,
  "page_id" integer NOT NULL,
  PRIMARY KEY ("tag_id", "page_id"),
  CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "tag_pages_pageId_idx" to table: "tag_pages"
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages" ("page_id");
-- Create index "tag_pages_tagId_idx" to table: "tag_pages"
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages" ("tag_id");
-- Create "translation_jobs" table
CREATE TABLE "translation_jobs" (
  "id" serial NOT NULL,
  "page_id" integer NOT NULL,
  "user_id" text NULL,
  "locale" text NOT NULL,
  "ai_model" text NOT NULL,
  "status" "translation_status" NOT NULL DEFAULT 'PENDING',
  "progress" integer NOT NULL DEFAULT 0,
  "error" text NOT NULL DEFAULT '',
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "translation_jobs_pageId_fkey" FOREIGN KEY ("page_id") REFERENCES "pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "translation_jobs_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "translation_jobs_userId_idx" to table: "translation_jobs"
CREATE INDEX "translation_jobs_userId_idx" ON "translation_jobs" ("user_id");
-- Create "translation_votes" table
CREATE TABLE "translation_votes" (
  "translation_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "is_upvote" boolean NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "translation_votes_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "segment_translations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "translation_votes_translation_id_idx" to table: "translation_votes"
CREATE INDEX "translation_votes_translation_id_idx" ON "translation_votes" ("translation_id");
-- Create index "translation_votes_translation_id_user_id_key" to table: "translation_votes"
CREATE UNIQUE INDEX "translation_votes_translation_id_user_id_key" ON "translation_votes" ("translation_id", "user_id");
-- Create index "translation_votes_user_id_idx" to table: "translation_votes"
CREATE INDEX "translation_votes_user_id_idx" ON "translation_votes" ("user_id");
-- Create "user_settings" table
CREATE TABLE "user_settings" (
  "id" serial NOT NULL,
  "user_id" text NOT NULL,
  "target_locales" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT
);
-- Create index "user_settings_user_id_key" to table: "user_settings"
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings" ("user_id");
