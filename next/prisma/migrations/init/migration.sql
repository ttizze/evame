-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "icon" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "is_ai" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'Credentials',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "display_name" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_emails" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "user_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" SERIAL NOT NULL,
    "password" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gemini_api_keys" (
    "id" SERIAL NOT NULL,
    "api_key" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER NOT NULL,

    CONSTRAINT "gemini_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ai_translation_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "ai_translation_status" TEXT NOT NULL DEFAULT 'pending',
    "ai_translation_progress" INTEGER NOT NULL DEFAULT 0,
    "ai_model" TEXT NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ai_translation_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_read_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "page_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_data_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_read_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'unknown',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_texts" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "page_id" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text_and_occurrence_hash" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translate_texts" (
    "id" SERIAL NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source_text_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "point" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "translate_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "like_pages" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guest_id" TEXT,

    CONSTRAINT "like_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre_pages" (
    "genreId" INTEGER NOT NULL,
    "pageId" INTEGER NOT NULL,

    CONSTRAINT "genre_pages_pkey" PRIMARY KEY ("genreId","pageId")
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
CREATE TABLE "votes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "translate_text_id" INTEGER NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "amount_used" INTEGER NOT NULL,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomAIModel" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomAIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_name_key" ON "users"("user_name");

-- CreateIndex
CREATE INDEX "users_user_name_idx" ON "users"("user_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_emails_email_key" ON "user_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_emails_user_id_key" ON "user_emails"("user_id");

-- CreateIndex
CREATE INDEX "user_emails_user_id_idx" ON "user_emails"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_userId_key" ON "user_credentials"("userId");

-- CreateIndex
CREATE INDEX "user_credentials_userId_idx" ON "user_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gemini_api_keys_userId_key" ON "gemini_api_keys"("userId");

-- CreateIndex
CREATE INDEX "gemini_api_keys_userId_idx" ON "gemini_api_keys"("userId");

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_user_id_idx" ON "user_ai_translation_info"("user_id");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_page_id_idx" ON "user_ai_translation_info"("page_id");

-- CreateIndex
CREATE INDEX "user_ai_translation_info_page_id_locale_idx" ON "user_ai_translation_info"("page_id", "locale");

-- CreateIndex
CREATE INDEX "user_read_history_user_id_idx" ON "user_read_history"("user_id");

-- CreateIndex
CREATE INDEX "user_read_history_page_id_idx" ON "user_read_history"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_read_history_user_id_page_id_key" ON "user_read_history"("user_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_created_at_idx" ON "pages"("created_at");

-- CreateIndex
CREATE INDEX "pages_user_id_idx" ON "pages"("user_id");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "source_texts_page_id_idx" ON "source_texts"("page_id");

-- CreateIndex
CREATE INDEX "source_texts_number_idx" ON "source_texts"("number");

-- CreateIndex
CREATE INDEX "source_texts_text_and_occurrence_hash_idx" ON "source_texts"("text_and_occurrence_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_texts_page_id_number_key" ON "source_texts"("page_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "source_texts_page_id_text_and_occurrence_hash_key" ON "source_texts"("page_id", "text_and_occurrence_hash");

-- CreateIndex
CREATE INDEX "translate_texts_source_text_id_idx" ON "translate_texts"("source_text_id");

-- CreateIndex
CREATE INDEX "translate_texts_user_id_idx" ON "translate_texts"("user_id");

-- CreateIndex
CREATE INDEX "translate_texts_locale_idx" ON "translate_texts"("locale");

-- CreateIndex
CREATE INDEX "like_pages_user_id_idx" ON "like_pages"("user_id");

-- CreateIndex
CREATE INDEX "like_pages_page_id_idx" ON "like_pages"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_user_id_page_id_key" ON "like_pages"("user_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "like_pages_guest_id_page_id_key" ON "like_pages"("guest_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE INDEX "genres_name_idx" ON "genres"("name");

-- CreateIndex
CREATE INDEX "genre_pages_genreId_idx" ON "genre_pages"("genreId");

-- CreateIndex
CREATE INDEX "genre_pages_pageId_idx" ON "genre_pages"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages"("tagId");

-- CreateIndex
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages"("pageId");

-- CreateIndex
CREATE INDEX "votes_translate_text_id_idx" ON "votes"("translate_text_id");

-- CreateIndex
CREATE INDEX "votes_user_id_idx" ON "votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_translate_text_id_user_id_key" ON "votes"("translate_text_id", "user_id");

-- CreateIndex
CREATE INDEX "api_usage_user_id_idx" ON "api_usage"("user_id");

-- CreateIndex
CREATE INDEX "api_usage_date_time_idx" ON "api_usage"("date_time");

-- CreateIndex
CREATE INDEX "CustomAIModel_userId_idx" ON "CustomAIModel"("userId");

-- CreateIndex
CREATE INDEX "CustomAIModel_name_idx" ON "CustomAIModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomAIModel_userId_name_key" ON "CustomAIModel"("userId", "name");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_page_id_idx" ON "comments"("page_id");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at");

-- AddForeignKey
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_translation_info" ADD CONSTRAINT "user_ai_translation_info_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ai_translation_info" ADD CONSTRAINT "user_ai_translation_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_history" ADD CONSTRAINT "user_read_history_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_read_history" ADD CONSTRAINT "user_read_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_texts" ADD CONSTRAINT "source_texts_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translate_texts" ADD CONSTRAINT "translate_texts_source_text_id_fkey" FOREIGN KEY ("source_text_id") REFERENCES "source_texts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translate_texts" ADD CONSTRAINT "translate_texts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_pages" ADD CONSTRAINT "like_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genre_pages" ADD CONSTRAINT "genre_pages_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genre_pages" ADD CONSTRAINT "genre_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_translate_text_id_fkey" FOREIGN KEY ("translate_text_id") REFERENCES "translate_texts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomAIModel" ADD CONSTRAINT "CustomAIModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

