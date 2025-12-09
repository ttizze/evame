-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "TranslationProofStatus" AS ENUM ('MACHINE_DRAFT', 'HUMAN_TOUCHED', 'PROOFREAD', 'VALIDATED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'PAGE_COMMENT', 'PAGE_LIKE', 'PAGE_SEGMENT_TRANSLATION_VOTE', 'PAGE_COMMENT_SEGMENT_TRANSLATION_VOTE');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('PAGE', 'PAGE_COMMENT');

-- CreateEnum
CREATE TYPE "SegmentTypeKey" AS ENUM ('PRIMARY', 'COMMENTARY');

-- CreateTable
CREATE TABLE "users" (
    "image" TEXT NOT NULL DEFAULT 'https://evame.tech/avatar.png',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "is_ai" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'Credentials',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL DEFAULT 'new_user',
    "handle" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL DEFAULT (uuid_generate_v7())::text,
    "email" TEXT NOT NULL,
    "twitterHandle" TEXT NOT NULL DEFAULT '',
    "emailVerified" BOOLEAN,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_locales" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gemini_api_keys" (
    "id" SERIAL NOT NULL,
    "api_key" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "gemini_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_jobs" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "userId" TEXT,
    "locale" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_locale" TEXT NOT NULL DEFAULT 'unknown',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "user_id" TEXT NOT NULL,
    "mdast_json" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parent_id" INTEGER,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "pageId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("pageId")
);

-- CreateTable
CREATE TABLE "page_locale_translation_proofs" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "translation_proof_status" "TranslationProofStatus" NOT NULL DEFAULT 'MACHINE_DRAFT',

    CONSTRAINT "page_locale_translation_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "like_pages" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guest_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "like_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_pages" (
    "tagId" INTEGER NOT NULL,
    "pageId" INTEGER NOT NULL,

    CONSTRAINT "tag_pages_pkey" PRIMARY KEY ("tagId","pageId")
);

-- CreateTable
CREATE TABLE "page_comments" (
    "id" INTEGER NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locale" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" INTEGER,
    "mdast_json" JSONB NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_reply_at" TIMESTAMP(3),
    "reply_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" TEXT NOT NULL DEFAULT (uuid_generate_v7())::text,
    "password" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT NOT NULL,
    "page_comment_id" INTEGER,
    "page_id" INTEGER,
    "segment_translation_id" INTEGER,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" TEXT NOT NULL DEFAULT (uuid_generate_v7())::text,
    "ipAddress" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" SERIAL NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "import_file_id" INTEGER,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_types" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "key" "SegmentTypeKey" NOT NULL,

    CONSTRAINT "segment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segments" (
    "id" SERIAL NOT NULL,
    "content_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "segment_type_id" INTEGER NOT NULL,

    CONSTRAINT "segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_annotation_links" (
    "main_segment_id" INTEGER NOT NULL,
    "annotation_segment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_annotation_links_pkey" PRIMARY KEY ("main_segment_id","annotation_segment_id")
);

-- CreateTable
CREATE TABLE "segment_metadata_types" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "segment_metadata_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_metadata" (
    "id" SERIAL NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "metadata_type_id" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "segment_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "segment_translations" (
    "id" SERIAL NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_votes" (
    "translation_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "import_runs" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_files" (
    "id" SERIAL NOT NULL,
    "import_run_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials"("user_id");

-- CreateIndex
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "gemini_api_keys_user_id_key" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "translation_jobs_userId_idx" ON "translation_jobs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_parent_id_idx" ON "pages"("parent_id");

-- CreateIndex
CREATE INDEX "pages_created_at_idx" ON "pages"("created_at");

-- CreateIndex
CREATE INDEX "pages_parent_id_order_idx" ON "pages"("parent_id", "order");

-- CreateIndex
CREATE INDEX "pages_user_id_idx" ON "pages"("user_id");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "page_locale_translation_proofs_translation_proof_status_idx" ON "page_locale_translation_proofs"("translation_proof_status");

-- CreateIndex
CREATE UNIQUE INDEX "page_locale_translation_proofs_page_id_locale_key" ON "page_locale_translation_proofs"("page_id", "locale");

-- CreateIndex
CREATE INDEX "like_pages_user_id_idx" ON "like_pages"("user_id");

-- CreateIndex
CREATE INDEX "like_pages_page_id_idx" ON "like_pages"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages"("user_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_guest_id_page_id_key" ON "like_pages"("guest_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages"("tagId");

-- CreateIndex
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages"("pageId");

-- CreateIndex
CREATE INDEX "page_comments_page_id_parent_id_created_at_idx" ON "page_comments"("page_id", "parent_id", "created_at");

-- CreateIndex
CREATE INDEX "page_comments_parent_id_is_deleted_created_at_idx" ON "page_comments"("parent_id", "is_deleted", "created_at");

-- CreateIndex
CREATE INDEX "page_comments_user_id_idx" ON "page_comments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_actor_id_idx" ON "notifications"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "contents_kind_idx" ON "contents"("kind");

-- CreateIndex
CREATE INDEX "segment_types_key_idx" ON "segment_types"("key");

-- CreateIndex
CREATE INDEX "segment_types_label_idx" ON "segment_types"("label");

-- CreateIndex
CREATE UNIQUE INDEX "segment_types_key_label_key" ON "segment_types"("key", "label");

-- CreateIndex
CREATE INDEX "segments_content_id_idx" ON "segments"("content_id");

-- CreateIndex
CREATE INDEX "segments_text_and_occurrence_hash_idx" ON "segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "segments_content_id_number_key" ON "segments"("content_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "segments_content_id_text_and_occurrence_hash_key" ON "segments"("content_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "segment_annotation_links_main_segment_id_idx" ON "segment_annotation_links"("main_segment_id");

-- CreateIndex
CREATE INDEX "segment_annotation_links_annotation_segment_id_idx" ON "segment_annotation_links"("annotation_segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_metadata_types_key_key" ON "segment_metadata_types"("key");

-- CreateIndex
CREATE INDEX "segment_metadata_metadata_type_id_idx" ON "segment_metadata"("metadata_type_id");

-- CreateIndex
CREATE INDEX "segment_metadata_segment_id_idx" ON "segment_metadata"("segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "segment_metadata_segment_id_metadata_type_id_value_key" ON "segment_metadata"("segment_id", "metadata_type_id", "value");

-- CreateIndex
CREATE INDEX "segment_translations_segment_id_locale_idx" ON "segment_translations"("segment_id", "locale");

-- CreateIndex
CREATE INDEX "segment_translations_user_id_idx" ON "segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "translation_votes_translation_id_idx" ON "translation_votes"("translation_id");

-- CreateIndex
CREATE INDEX "translation_votes_user_id_idx" ON "translation_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "translation_votes_translation_id_user_id_key" ON "translation_votes"("translation_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_id_fkey" FOREIGN KEY ("id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_locale_translation_proofs" ADD CONSTRAINT "page_locale_translation_proofs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_id_fkey" FOREIGN KEY ("id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "page_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_segment_translation_id_fkey" FOREIGN KEY ("segment_translation_id") REFERENCES "segment_translations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_import_file_id_fkey" FOREIGN KEY ("import_file_id") REFERENCES "import_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_segment_type_id_fkey" FOREIGN KEY ("segment_type_id") REFERENCES "segment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_annotation_segment_id_fkey" FOREIGN KEY ("annotation_segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_annotation_links" ADD CONSTRAINT "segment_annotation_links_main_segment_id_fkey" FOREIGN KEY ("main_segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_metadata" ADD CONSTRAINT "segment_metadata_metadata_type_id_fkey" FOREIGN KEY ("metadata_type_id") REFERENCES "segment_metadata_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_metadata" ADD CONSTRAINT "segment_metadata_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_translations" ADD CONSTRAINT "segment_translations_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segment_translations" ADD CONSTRAINT "segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_votes" ADD CONSTRAINT "translation_votes_translation_id_fkey" FOREIGN KEY ("translation_id") REFERENCES "segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_votes" ADD CONSTRAINT "translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_files" ADD CONSTRAINT "import_files_import_run_id_fkey" FOREIGN KEY ("import_run_id") REFERENCES "import_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

