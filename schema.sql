-- UUID v7 拡張（uuid_generate_v7 を利用）
CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updatedAt (CamelCase) 用
CREATE OR REPLACE FUNCTION set_updatedAt()
RETURNS trigger AS $$
BEGIN
    NEW."updatedAt" := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TYPE "public"."ContentKind" AS ENUM ('PAGE_COMMENT', 'PAGE');

CREATE TYPE "public"."NotificationType" AS ENUM ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE', 'PAGE_SEGMENT_TRANSLATION_VOTE');

CREATE TYPE "public"."PageStatus" AS ENUM ('PUBLIC', 'DRAFT', 'ARCHIVE');

CREATE TYPE "public"."SegmentTypeKey" AS ENUM ('COMMENTARY', 'PRIMARY');

CREATE TYPE "public"."TranslationProofStatus" AS ENUM ('HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED', 'MACHINE_DRAFT');

CREATE TYPE "public"."TranslationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FAILED', 'COMPLETED');


CREATE TABLE "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" text,
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone NOT NULL DEFAULT now(),
    "applied_steps_count" integer NOT NULL DEFAULT 0,
    CONSTRAINT _prisma_migrations_pkey PRIMARY KEY ("id")
);

CREATE TABLE "public"."accounts" (
    "userId" text NOT NULL,
    "provider" text NOT NULL,
    "providerAccountId" text NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "scope" text,
    "id_token" text,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" text NOT NULL DEFAULT uuid_generate_v7()::text,
    "password" text,
    "refreshTokenExpiresAt" timestamp(3),
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" timestamp(3),
    CONSTRAINT accounts_pkey PRIMARY KEY ("id")
);

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON "public"."accounts"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");

ALTER TABLE ONLY "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."contents" (
    "id" serial NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "import_file_id" integer,
    CONSTRAINT contents_pkey PRIMARY KEY ("id")
);

CREATE INDEX contents_kind_idx ON public.contents USING btree (kind);

ALTER TABLE ONLY "public"."contents" ADD CONSTRAINT "contents_import_file_id_fkey" FOREIGN KEY ("import_file_id") REFERENCES "public"."import_files" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TRIGGER contents_set_updated_at
BEFORE UPDATE ON "public"."contents"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "public"."follows" (
    "id" serial NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "follower_id" text NOT NULL,
    "following_id" text NOT NULL,
    CONSTRAINT follows_pkey PRIMARY KEY ("id")
);

CREATE INDEX follows_follower_id_idx ON public.follows USING btree (follower_id);

CREATE INDEX follows_following_id_idx ON public.follows USING btree (following_id);

ALTER TABLE ONLY "public"."follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_follower_id_following_id_key" UNIQUE (follower_id, following_id);

CREATE TABLE "public"."gemini_api_keys" (
    "id" serial NOT NULL,
    "api_key" text NOT NULL DEFAULT ''::text,
    "user_id" text NOT NULL,
    CONSTRAINT gemini_api_keys_pkey PRIMARY KEY ("id")
);

CREATE INDEX gemini_api_keys_user_id_idx ON public.gemini_api_keys USING btree (user_id);

CREATE UNIQUE INDEX gemini_api_keys_user_id_key ON public.gemini_api_keys USING btree (user_id);

ALTER TABLE ONLY "public"."gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."import_files" (
    "id" serial NOT NULL,
    "import_run_id" integer NOT NULL,
    "path" text NOT NULL,
    "checksum" text NOT NULL,
    "status" text NOT NULL DEFAULT 'PENDING'::text,
    "message" text NOT NULL DEFAULT ''::text,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT import_files_pkey PRIMARY KEY ("id")
);

ALTER TABLE ONLY "public"."import_files" ADD CONSTRAINT "import_files_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."import_runs" (
    "id" serial NOT NULL,
    "started_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" timestamp(3),
    "status" text NOT NULL DEFAULT 'RUNNING'::text,
    CONSTRAINT import_runs_pkey PRIMARY KEY ("id")
);

CREATE TABLE "public"."like_pages" (
    "id" serial NOT NULL,
    "page_id" integer NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guest_id" text,
    "user_id" text,
    CONSTRAINT like_pages_pkey PRIMARY KEY ("id")
);

CREATE INDEX like_pages_page_id_idx ON public.like_pages USING btree (page_id);

CREATE INDEX like_pages_user_id_idx ON public.like_pages USING btree (user_id);

CREATE UNIQUE INDEX like_pages_guest_id_page_id_key ON public.like_pages USING btree (guest_id, page_id);

CREATE UNIQUE INDEX like_pages_user_id_page_id_key ON public.like_pages USING btree (user_id, page_id);

ALTER TABLE ONLY "public"."like_pages" ADD CONSTRAINT "like_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."like_pages" ADD CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."notifications" (
    "id" serial NOT NULL,
    "user_id" text NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" boolean NOT NULL DEFAULT false,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" text NOT NULL,
    "page_comment_id" integer,
    "page_id" integer,
    "segment_translation_id" integer,
    CONSTRAINT notifications_pkey PRIMARY KEY ("id")
);

CREATE INDEX notifications_actor_id_idx ON public.notifications USING btree (actor_id);

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "public"."page_comments" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_segment_translation_id_fkey" FOREIGN KEY ("segment_translation_id") REFERENCES "public"."segment_translations" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."page_comments" (
    "id" integer NOT NULL,
    "page_id" integer NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    "locale" text NOT NULL,
    "user_id" text NOT NULL,
    "parent_id" integer,
    "mdast_json" jsonb NOT NULL,
    "is_deleted" boolean NOT NULL DEFAULT false,
    "last_reply_at" timestamp(3),
    "reply_count" integer NOT NULL DEFAULT 0,
    CONSTRAINT page_comments_pkey PRIMARY KEY ("id")
);

CREATE INDEX page_comments_page_id_parent_id_created_at_idx ON public.page_comments USING btree (page_id, parent_id, created_at);

CREATE INDEX page_comments_parent_id_is_deleted_created_at_idx ON public.page_comments USING btree (parent_id, is_deleted, created_at);

CREATE INDEX page_comments_user_id_idx ON public.page_comments USING btree (user_id);

ALTER TABLE ONLY "public"."page_comments" ADD CONSTRAINT "page_comments_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."contents" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."page_comments" ADD CONSTRAINT "page_comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."page_comments" ADD CONSTRAINT "page_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."page_comments" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."page_comments" ADD CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TRIGGER page_comments_set_updated_at
BEFORE UPDATE ON "public"."page_comments"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "public"."page_locale_translation_proofs" (
    "id" serial NOT NULL,
    "page_id" integer NOT NULL,
    "locale" text NOT NULL,
    "translation_proof_status" "TranslationProofStatus" NOT NULL DEFAULT 'MACHINE_DRAFT'::"TranslationProofStatus",
    CONSTRAINT page_locale_translation_proofs_pkey PRIMARY KEY ("id")
);

CREATE INDEX page_locale_translation_proofs_translation_proof_status_idx ON public.page_locale_translation_proofs USING btree (translation_proof_status);

CREATE UNIQUE INDEX page_locale_translation_proofs_page_id_locale_key ON public.page_locale_translation_proofs USING btree (page_id, locale);

ALTER TABLE ONLY "public"."page_locale_translation_proofs" ADD CONSTRAINT "page_locale_translation_proofs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."page_views" (
    "pageId" integer NOT NULL,
    "count" integer NOT NULL DEFAULT 0,
    CONSTRAINT page_views_pkey PRIMARY KEY ("pageId")
);

ALTER TABLE ONLY "public"."page_views" ADD CONSTRAINT "page_views_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."pages" (
    "id" integer NOT NULL,
    "slug" text NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_locale" text NOT NULL DEFAULT 'unknown'::text,
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT'::"PageStatus",
    "user_id" text NOT NULL,
    "mdast_json" jsonb NOT NULL,
    "order" integer NOT NULL DEFAULT 0,
    "parent_id" integer,
    CONSTRAINT pages_pkey PRIMARY KEY ("id")
);

CREATE INDEX pages_created_at_idx ON public.pages USING btree (created_at);

CREATE INDEX pages_parent_id_idx ON public.pages USING btree (parent_id);

CREATE INDEX pages_parent_id_order_idx ON public.pages USING btree (parent_id, "order");

CREATE INDEX pages_slug_idx ON public.pages USING btree (slug);

CREATE INDEX pages_user_id_idx ON public.pages USING btree (user_id);

CREATE UNIQUE INDEX pages_slug_key ON public.pages USING btree (slug);

ALTER TABLE ONLY "public"."pages" ADD CONSTRAINT "pages_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."contents" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TRIGGER pages_set_updated_at
BEFORE UPDATE ON "public"."pages"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "public"."segment_annotation_links" (
    "main_segment_id" integer NOT NULL,
    "annotation_segment_id" integer NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT segment_annotation_links_pkey PRIMARY KEY ("main_segment_id", "annotation_segment_id")
);

CREATE INDEX segment_annotation_links_annotation_segment_id_idx ON public.segment_annotation_links USING btree (annotation_segment_id);

CREATE INDEX segment_annotation_links_main_segment_id_idx ON public.segment_annotation_links USING btree (main_segment_id);

ALTER TABLE ONLY "public"."segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_annotation_segment_id_fkey" FOREIGN KEY ("annotation_segment_id") REFERENCES "public"."segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_main_segment_id_fkey" FOREIGN KEY ("main_segment_id") REFERENCES "public"."segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."segment_metadata" (
    "id" serial NOT NULL,
    "segment_id" integer NOT NULL,
    "metadata_type_id" integer NOT NULL,
    "value" text NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT segment_metadata_pkey PRIMARY KEY ("id")
);

CREATE INDEX segment_metadata_metadata_type_id_idx ON public.segment_metadata USING btree (metadata_type_id);

CREATE INDEX segment_metadata_segment_id_idx ON public.segment_metadata USING btree (segment_id);

CREATE UNIQUE INDEX segment_metadata_segment_id_metadata_type_id_value_key ON public.segment_metadata USING btree (segment_id, metadata_type_id, value);

ALTER TABLE ONLY "public"."segment_metadata" ADD CONSTRAINT "segment_metadata_metadata_type_id_fkey" FOREIGN KEY ("metadata_type_id") REFERENCES "public"."segment_metadata_types" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."segment_metadata" ADD CONSTRAINT "segment_metadata_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."segment_metadata_types" (
    "id" serial NOT NULL,
    "key" text NOT NULL,
    "label" text NOT NULL,
    CONSTRAINT segment_metadata_types_pkey PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX segment_metadata_types_key_key ON public.segment_metadata_types USING btree (key);

CREATE TABLE "public"."segment_translations" (
    "id" serial NOT NULL,
    "segment_id" integer NOT NULL,
    "locale" text NOT NULL,
    "text" text NOT NULL,
    "point" integer NOT NULL DEFAULT 0,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" text NOT NULL,
    CONSTRAINT segment_translations_pkey PRIMARY KEY ("id")
);

CREATE INDEX segment_translations_segment_id_locale_idx ON public.segment_translations USING btree (segment_id, locale);

CREATE INDEX segment_translations_user_id_idx ON public.segment_translations USING btree (user_id);

ALTER TABLE ONLY "public"."segment_translations" ADD CONSTRAINT "segment_translations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."segment_translations" ADD CONSTRAINT "segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."segment_types" (
    "id" serial NOT NULL,
    "label" text NOT NULL,
    "key" "SegmentTypeKey" NOT NULL,
    CONSTRAINT segment_types_pkey PRIMARY KEY ("id")
);

CREATE INDEX segment_types_key_idx ON public.segment_types USING btree (key);

CREATE INDEX segment_types_label_idx ON public.segment_types USING btree (label);

CREATE UNIQUE INDEX segment_types_key_label_key ON public.segment_types USING btree (key, label);

CREATE TABLE "public"."segments" (
    "id" serial NOT NULL,
    "content_id" integer NOT NULL,
    "number" integer NOT NULL,
    "text" text NOT NULL,
    "text_and_occurrence_hash" text NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "segment_type_id" integer NOT NULL,
    CONSTRAINT segments_pkey PRIMARY KEY ("id")
);

CREATE INDEX segments_content_id_idx ON public.segments USING btree (content_id);

CREATE INDEX segments_text_and_occurrence_hash_idx ON public.segments USING btree (text_and_occurrence_hash);

CREATE UNIQUE INDEX segments_content_id_number_key ON public.segments USING btree (content_id, number);

CREATE UNIQUE INDEX segments_content_id_text_and_occurrence_hash_key ON public.segments USING btree (content_id, text_and_occurrence_hash);

ALTER TABLE ONLY "public"."segments" ADD CONSTRAINT "segments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."segments" ADD CONSTRAINT "segments_segment_type_id_fkey" FOREIGN KEY ("segment_type_id") REFERENCES "public"."segment_types" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE "public"."sessions" (
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    "expires" timestamp(3) NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" text NOT NULL DEFAULT uuid_generate_v7()::text,
    "ipAddress" text,
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" text,
    CONSTRAINT sessions_pkey PRIMARY KEY ("id")
);

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON "public"."sessions"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");

ALTER TABLE ONLY "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."tag_pages" (
    "tagId" integer NOT NULL,
    "pageId" integer NOT NULL,
    CONSTRAINT tag_pages_pkey PRIMARY KEY ("tagId", "pageId")
);

CREATE INDEX "tag_pages_pageId_idx" ON public.tag_pages USING btree ("pageId");

CREATE INDEX "tag_pages_tagId_idx" ON public.tag_pages USING btree ("tagId");

ALTER TABLE ONLY "public"."tag_pages" ADD CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tag_pages" ADD CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TABLE "public"."tags" (
    "id" serial NOT NULL,
    "name" text NOT NULL,
    CONSTRAINT tags_pkey PRIMARY KEY ("id")
);

CREATE INDEX tags_name_idx ON public.tags USING btree (name);

CREATE UNIQUE INDEX tags_name_key ON public.tags USING btree (name);

CREATE TABLE "public"."translation_jobs" (
    "id" serial NOT NULL,
    "pageId" integer NOT NULL,
    "userId" text,
    "locale" text NOT NULL,
    "aiModel" text NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING'::"TranslationStatus",
    "progress" integer NOT NULL DEFAULT 0,
    "error" text NOT NULL DEFAULT ''::text,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT translation_jobs_pkey PRIMARY KEY ("id")
);

CREATE INDEX "translation_jobs_userId_idx" ON public.translation_jobs USING btree ("userId");

ALTER TABLE ONLY "public"."translation_jobs" ADD CONSTRAINT "translation_jobs_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."translation_jobs" ADD CONSTRAINT "translation_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TRIGGER translation_jobs_set_updatedAt
BEFORE UPDATE ON "public"."translation_jobs"
FOR EACH ROW EXECUTE FUNCTION set_updatedAt();

CREATE TABLE "public"."translation_votes" (
    "translation_id" integer NOT NULL,
    "user_id" text NOT NULL,
    "is_upvote" boolean NOT NULL,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX translation_votes_translation_id_idx ON public.translation_votes USING btree (translation_id);

CREATE INDEX translation_votes_user_id_idx ON public.translation_votes USING btree (user_id);

CREATE UNIQUE INDEX translation_votes_translation_id_user_id_key ON public.translation_votes USING btree (translation_id, user_id);

ALTER TABLE ONLY "public"."translation_votes" ADD CONSTRAINT "translation_votes_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "public"."segment_translations" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."translation_votes" ADD CONSTRAINT "translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TRIGGER translation_votes_set_updated_at
BEFORE UPDATE ON "public"."translation_votes"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "public"."user_credentials" (
    "id" serial NOT NULL,
    "password" text NOT NULL,
    "user_id" text NOT NULL,
    CONSTRAINT user_credentials_pkey PRIMARY KEY ("id")
);

CREATE INDEX user_credentials_user_id_idx ON public.user_credentials USING btree (user_id);

CREATE UNIQUE INDEX user_credentials_user_id_key ON public.user_credentials USING btree (user_id);

ALTER TABLE ONLY "public"."user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TABLE "public"."user_settings" (
    "id" serial NOT NULL,
    "user_id" text NOT NULL,
    "target_locales" text[] NOT NULL DEFAULT ARRAY[]::text[],
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_settings_pkey PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX user_settings_user_id_key ON public.user_settings USING btree (user_id);

ALTER TABLE ONLY "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE TRIGGER user_settings_set_updated_at
BEFORE UPDATE ON "public"."user_settings"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "public"."users" (
    "image" text NOT NULL DEFAULT 'https://evame.tech/avatar.png'::text,
    "plan" text NOT NULL DEFAULT 'free'::text,
    "total_points" integer NOT NULL DEFAULT 0,
    "is_ai" boolean NOT NULL DEFAULT false,
    "provider" text NOT NULL DEFAULT 'Credentials'::text,
    "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" text NOT NULL DEFAULT 'new_user'::text,
    "handle" text NOT NULL,
    "profile" text NOT NULL DEFAULT ''::text,
    "id" text NOT NULL DEFAULT uuid_generate_v7()::text,
    "email" text NOT NULL,
    "twitterHandle" text NOT NULL DEFAULT ''::text,
    "emailVerified" boolean,
    CONSTRAINT users_pkey PRIMARY KEY ("id")
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON "public"."users"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_handle_key ON public.users USING btree (handle);

CREATE TABLE "public"."verification" (
    "id" text NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamp(3) NOT NULL,
    "createdAt" timestamp(3),
    "updatedAt" timestamp(3),
    CONSTRAINT verification_pkey PRIMARY KEY ("id")
);

CREATE TABLE "public"."verification_tokens" (
    "identifier" text NOT NULL,
    "token" text NOT NULL,
    "expires" timestamp(3) NOT NULL,
    CONSTRAINT verification_tokens_pkey PRIMARY KEY ("identifier", "token")
);

CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);
