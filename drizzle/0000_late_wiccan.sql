-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

CREATE TYPE "public"."ContentKind" AS ENUM('PAGE', 'PAGE_COMMENT');--> statement-breakpoint
CREATE TYPE "public"."NotificationType" AS ENUM('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE');--> statement-breakpoint
CREATE TYPE "public"."PageStatus" AS ENUM('DRAFT', 'PUBLIC', 'ARCHIVE');--> statement-breakpoint
CREATE TYPE "public"."SegmentTypeKey" AS ENUM('PRIMARY', 'COMMENTARY');--> statement-breakpoint
CREATE TYPE "public"."TranslationProofStatus" AS ENUM('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED');--> statement-breakpoint
CREATE TYPE "public"."TranslationStatus" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3),
	"updatedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_key" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "like_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"guest_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "import_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_run_id" integer NOT NULL,
	"path" text NOT NULL,
	"checksum" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "ContentKind" NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"import_file_id" integer
);
--> statement-breakpoint
CREATE TABLE "gemini_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key" text DEFAULT '' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"finished_at" timestamp(3),
	"status" text DEFAULT 'RUNNING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "NotificationType" NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"actor_id" text NOT NULL,
	"page_comment_id" integer,
	"page_id" integer,
	"segment_translation_id" integer
);
--> statement-breakpoint
CREATE TABLE "segment_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"key" "SegmentTypeKey" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"scope" text,
	"id_token" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"id" text PRIMARY KEY DEFAULT (uuid_generate_v7()) NOT NULL,
	"password" text,
	"refreshTokenExpiresAt" timestamp(3),
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "translation_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"pageId" integer NOT NULL,
	"userId" text,
	"locale" text NOT NULL,
	"aiModel" text NOT NULL,
	"status" "TranslationStatus" DEFAULT 'PENDING' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"pageId" integer PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"id" text PRIMARY KEY DEFAULT (uuid_generate_v7()) NOT NULL,
	"ipAddress" text,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userAgent" text
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_locale_translation_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"locale" text NOT NULL,
	"translation_proof_status" "TranslationProofStatus" DEFAULT 'MACHINE_DRAFT' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_metadata_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_votes" (
	"translation_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"is_upvote" boolean NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"password" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"segment_id" integer NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"point" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_comments" (
	"id" integer PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"locale" text NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" integer,
	"mdast_json" jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"last_reply_at" timestamp(3),
	"reply_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"source_locale" text DEFAULT 'unknown' NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" "PageStatus" DEFAULT 'DRAFT' NOT NULL,
	"user_id" text NOT NULL,
	"mdast_json" jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"parent_id" integer
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"number" integer NOT NULL,
	"text" text NOT NULL,
	"text_and_occurrence_hash" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"segment_type_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"segment_id" integer NOT NULL,
	"metadata_type_id" integer NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"image" text DEFAULT 'https://evame.tech/avatar.png' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"is_ai" boolean DEFAULT false NOT NULL,
	"provider" text DEFAULT 'Credentials' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text DEFAULT 'new_user' NOT NULL,
	"handle" text NOT NULL,
	"profile" text DEFAULT '' NOT NULL,
	"id" text PRIMARY KEY DEFAULT (uuid_generate_v7()) NOT NULL,
	"email" text NOT NULL,
	"twitterHandle" text DEFAULT '' NOT NULL,
	"emailVerified" boolean
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_locales" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_pages" (
	"tagId" integer NOT NULL,
	"pageId" integer NOT NULL,
	CONSTRAINT "tag_pages_pkey" PRIMARY KEY("tagId","pageId")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp(3) NOT NULL,
	CONSTRAINT "verification_tokens_pkey" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "segment_annotation_links" (
	"main_segment_id" integer NOT NULL,
	"annotation_segment_id" integer NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "segment_annotation_links_pkey" PRIMARY KEY("main_segment_id","annotation_segment_id")
);
--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "import_files" ADD CONSTRAINT "import_files_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_runs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_import_file_id_fkey" FOREIGN KEY ("import_file_id") REFERENCES "public"."import_files"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "public"."page_comments"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_segment_translation_id_fkey" FOREIGN KEY ("segment_translation_id") REFERENCES "public"."segment_translations"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_locale_translation_proofs" ADD CONSTRAINT "page_locale_translation_proofs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "translation_votes" ADD CONSTRAINT "translation_votes_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "public"."segment_translations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "translation_votes" ADD CONSTRAINT "translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segment_translations" ADD CONSTRAINT "segment_translations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segment_translations" ADD CONSTRAINT "segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."page_comments"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_segment_type_id_fkey" FOREIGN KEY ("segment_type_id") REFERENCES "public"."segment_types"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segment_metadata" ADD CONSTRAINT "segment_metadata_metadata_type_id_fkey" FOREIGN KEY ("metadata_type_id") REFERENCES "public"."segment_metadata_types"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segment_metadata" ADD CONSTRAINT "segment_metadata_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_annotation_segment_id_fkey" FOREIGN KEY ("annotation_segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_main_segment_id_fkey" FOREIGN KEY ("main_segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "follows_follower_id_idx" ON "follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "follows_following_id_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE UNIQUE INDEX "like_pages_guest_id_page_id_key" ON "like_pages" USING btree ("guest_id","page_id");--> statement-breakpoint
CREATE INDEX "like_pages_page_id_idx" ON "like_pages" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "like_pages_user_id_idx" ON "like_pages" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages" USING btree ("user_id","page_id");--> statement-breakpoint
CREATE INDEX "contents_kind_idx" ON "contents" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gemini_api_keys_user_id_key" ON "gemini_api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_actor_id_idx" ON "notifications" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "segment_types_key_idx" ON "segment_types" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_types_key_label_key" ON "segment_types" USING btree ("key","label");--> statement-breakpoint
CREATE INDEX "segment_types_label_idx" ON "segment_types" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "translation_jobs_userId_idx" ON "translation_jobs" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_key" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "page_locale_translation_proofs_page_id_locale_key" ON "page_locale_translation_proofs" USING btree ("page_id","locale");--> statement-breakpoint
CREATE INDEX "page_locale_translation_proofs_translation_proof_status_idx" ON "page_locale_translation_proofs" USING btree ("translation_proof_status");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_metadata_types_key_key" ON "segment_metadata_types" USING btree ("key");--> statement-breakpoint
CREATE INDEX "translation_votes_translation_id_idx" ON "translation_votes" USING btree ("translation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_votes_translation_id_user_id_key" ON "translation_votes" USING btree ("translation_id","user_id");--> statement-breakpoint
CREATE INDEX "translation_votes_user_id_idx" ON "translation_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "segment_translations_segment_id_locale_idx" ON "segment_translations" USING btree ("segment_id","locale");--> statement-breakpoint
CREATE INDEX "segment_translations_user_id_idx" ON "segment_translations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_comments_page_id_parent_id_created_at_idx" ON "page_comments" USING btree ("page_id","parent_id","created_at");--> statement-breakpoint
CREATE INDEX "page_comments_parent_id_is_deleted_created_at_idx" ON "page_comments" USING btree ("parent_id","is_deleted","created_at");--> statement-breakpoint
CREATE INDEX "page_comments_user_id_idx" ON "page_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pages_parent_id_idx" ON "pages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pages_parent_id_order_idx" ON "pages" USING btree ("parent_id","order");--> statement-breakpoint
CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_key" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_user_id_idx" ON "pages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "segments_content_id_idx" ON "segments" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_content_id_number_key" ON "segments" USING btree ("content_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_content_id_text_and_occurrence_hash_key" ON "segments" USING btree ("content_id","text_and_occurrence_hash");--> statement-breakpoint
CREATE INDEX "segments_text_and_occurrence_hash_idx" ON "segments" USING btree ("text_and_occurrence_hash");--> statement-breakpoint
CREATE INDEX "segment_metadata_metadata_type_id_idx" ON "segment_metadata" USING btree ("metadata_type_id");--> statement-breakpoint
CREATE INDEX "segment_metadata_segment_id_idx" ON "segment_metadata" USING btree ("segment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_metadata_segment_id_metadata_type_id_value_key" ON "segment_metadata" USING btree ("segment_id","metadata_type_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_key" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages" USING btree ("pageId");--> statement-breakpoint
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages" USING btree ("tagId");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "segment_annotation_links_annotation_segment_id_idx" ON "segment_annotation_links" USING btree ("annotation_segment_id");--> statement-breakpoint
CREATE INDEX "segment_annotation_links_main_segment_id_idx" ON "segment_annotation_links" USING btree ("main_segment_id");
