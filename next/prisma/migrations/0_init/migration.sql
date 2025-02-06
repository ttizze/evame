-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "image" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "is_ai" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'Credentials',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT '',
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "gemini_api_keys" (
    "id" SERIAL NOT NULL,
    "api_key" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "gemini_api_keys_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "page_comment_segment_translation_votes" (
    "id" SERIAL NOT NULL,
    "page_comment_segment_translation_id" INTEGER NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "page_comment_segment_translation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_comment_segment_translations" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "page_comment_segment_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "page_comment_segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_comment_segments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "page_comment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_comment_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_comments" (
    "id" SERIAL NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "locale" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_segment_translations" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "page_segment_id" INTEGER NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "page_segment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_segments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "page_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_locale" TEXT NOT NULL DEFAULT 'unknown',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_pages" (
    "tagId" INTEGER NOT NULL,
    "pageId" INTEGER NOT NULL,

    CONSTRAINT "tag_pages_pkey" PRIMARY KEY ("tagId","pageId")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ai_translation_info" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "ai_translation_progress" INTEGER NOT NULL DEFAULT 0,
    "ai_model" TEXT NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_translation_status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_ai_translation_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" SERIAL NOT NULL,
    "page_segment_translation_id" INTEGER NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE UNIQUE INDEX "gemini_api_keys_user_id_key" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "like_pages_page_id_idx" ON "like_pages"("page_id");

-- CreateIndex
CREATE INDEX "like_pages_user_id_idx" ON "like_pages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_guest_id_page_id_key" ON "like_pages"("guest_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages"("user_id", "page_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translation_votes_page_comment_segment_idx" ON "page_comment_segment_translation_votes"("page_comment_segment_translation_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translation_votes_user_id_idx" ON "page_comment_segment_translation_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_segment_translation_votes_page_comment_segment_key" ON "page_comment_segment_translation_votes"("page_comment_segment_translation_id", "user_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_locale_idx" ON "page_comment_segment_translations"("locale");

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_page_comment_segment_id_idx" ON "page_comment_segment_translations"("page_comment_segment_id");

-- CreateIndex
CREATE INDEX "page_comment_segment_translations_user_id_idx" ON "page_comment_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "page_comment_segments_page_comment_id_idx" ON "page_comment_segments"("page_comment_id");

-- CreateIndex
CREATE INDEX "page_comment_segments_text_and_occurrence_hash_idx" ON "page_comment_segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_segments_page_comment_id_number_key" ON "page_comment_segments"("page_comment_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_segments_page_comment_id_text_and_occurrence_h_key" ON "page_comment_segments"("page_comment_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "page_comments_created_at_idx" ON "page_comments"("created_at");

-- CreateIndex
CREATE INDEX "page_comments_page_id_idx" ON "page_comments"("page_id");

-- CreateIndex
CREATE INDEX "page_comments_user_id_idx" ON "page_comments"("user_id");

-- CreateIndex
CREATE INDEX "page_segment_translations_locale_idx" ON "page_segment_translations"("locale");

-- CreateIndex
CREATE INDEX "page_segment_translations_page_segment_id_idx" ON "page_segment_translations"("page_segment_id");

-- CreateIndex
CREATE INDEX "page_segment_translations_user_id_idx" ON "page_segment_translations"("user_id");

-- CreateIndex
CREATE INDEX "page_segments_number_idx" ON "page_segments"("number");

-- CreateIndex
CREATE INDEX "page_segments_page_id_idx" ON "page_segments"("page_id");

-- CreateIndex
CREATE INDEX "page_segments_text_and_occurrence_hash_idx" ON "page_segments"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "page_segments_page_id_number_key" ON "page_segments"("page_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "page_segments_page_id_text_and_occurrence_hash_key" ON "page_segments"("page_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_created_at_idx" ON "pages"("created_at");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_user_id_idx" ON "pages"("user_id");

-- CreateIndex
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages"("pageId");

-- CreateIndex
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_page_id_idx" ON "user_ai_translation_info"("page_id");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_page_id_locale_idx" ON "user_ai_translation_info"("page_id", "locale");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_user_id_idx" ON "user_ai_translation_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials"("user_id");

-- CreateIndex
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials"("user_id");

-- CreateIndex
CREATE INDEX "votes_page_segment_translation_id_idx" ON "votes"("page_segment_translation_id");

-- CreateIndex
CREATE INDEX "votes_user_id_idx" ON "votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_page_segment_translation_id_user_id_key" ON "votes"("page_segment_translation_id", "user_id");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translation_votes" ADD CONSTRAINT "page_comment_segment_translation_votes_page_comment_segmen_fkey" FOREIGN KEY ("page_comment_segment_translation_id") REFERENCES "page_comment_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translation_votes" ADD CONSTRAINT "page_comment_segment_translation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translations" ADD CONSTRAINT "page_comment_segment_translations_page_comment_segment_id_fkey" FOREIGN KEY ("page_comment_segment_id") REFERENCES "page_comment_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segment_translations" ADD CONSTRAINT "page_comment_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_segments" ADD CONSTRAINT "page_comment_segments_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_segment_translations" ADD CONSTRAINT "page_segment_translations_page_segment_id_fkey" FOREIGN KEY ("page_segment_id") REFERENCES "page_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_segment_translations" ADD CONSTRAINT "page_segment_translations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_segments" ADD CONSTRAINT "page_segments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_translation_info" ADD CONSTRAINT "user_ai_translation_info_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_translation_info" ADD CONSTRAINT "user_ai_translation_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_page_segment_translation_id_fkey" FOREIGN KEY ("page_segment_translation_id") REFERENCES "page_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

