-- カラム名をキャメルケースからスネークケースにリネームするマイグレーション

BEGIN;

-- accountsテーブル
ALTER TABLE "public"."accounts" DROP CONSTRAINT "accounts_userId_fkey";
DROP INDEX IF EXISTS "public"."accounts_provider_providerAccountId_key";
ALTER TABLE "public"."accounts" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "public"."accounts" RENAME COLUMN "providerAccountId" TO "provider_account_id";
ALTER TABLE "public"."accounts" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON public.accounts USING btree (provider, "provider_account_id");
ALTER TABLE ONLY "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- import_filesテーブル
ALTER TABLE "public"."import_files" RENAME COLUMN "createdAt" TO "created_at";

-- page_viewsテーブル
ALTER TABLE "public"."page_views" DROP CONSTRAINT "page_views_pkey";
ALTER TABLE "public"."page_views" DROP CONSTRAINT "page_views_pageId_fkey";
ALTER TABLE "public"."page_views" RENAME COLUMN "pageId" TO "page_id";
ALTER TABLE "public"."page_views" ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("page_id");
ALTER TABLE ONLY "public"."page_views" ADD CONSTRAINT "page_views_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- sessionsテーブル
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_userId_fkey";
DROP INDEX IF EXISTS "public"."sessions_sessionToken_key";
ALTER TABLE "public"."sessions" RENAME COLUMN "sessionToken" TO "session_token";
ALTER TABLE "public"."sessions" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "public"."sessions" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "public"."sessions" RENAME COLUMN "userAgent" TO "user_agent";
CREATE UNIQUE INDEX "sessions_session_token_key" ON public.sessions USING btree ("session_token");
ALTER TABLE ONLY "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- tag_pagesテーブル
ALTER TABLE "public"."tag_pages" DROP CONSTRAINT "tag_pages_pkey";
ALTER TABLE "public"."tag_pages" DROP CONSTRAINT "tag_pages_pageId_fkey";
ALTER TABLE "public"."tag_pages" DROP CONSTRAINT "tag_pages_tagId_fkey";
DROP INDEX IF EXISTS "public"."tag_pages_pageId_idx";
DROP INDEX IF EXISTS "public"."tag_pages_tagId_idx";
ALTER TABLE "public"."tag_pages" RENAME COLUMN "tagId" TO "tag_id";
ALTER TABLE "public"."tag_pages" RENAME COLUMN "pageId" TO "page_id";
ALTER TABLE "public"."tag_pages" ADD CONSTRAINT "tag_pages_pkey" PRIMARY KEY ("tag_id", "page_id");
CREATE INDEX "tag_pages_page_id_idx" ON public.tag_pages USING btree ("page_id");
CREATE INDEX "tag_pages_tag_id_idx" ON public.tag_pages USING btree ("tag_id");
ALTER TABLE ONLY "public"."tag_pages" ADD CONSTRAINT "tag_pages_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tag_pages" ADD CONSTRAINT "tag_pages_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags" ("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- translation_jobsテーブル
ALTER TABLE "public"."translation_jobs" DROP CONSTRAINT "translation_jobs_pageId_fkey";
ALTER TABLE "public"."translation_jobs" DROP CONSTRAINT "translation_jobs_userId_fkey";
DROP INDEX IF EXISTS "public"."translation_jobs_userId_idx";
DROP TRIGGER IF EXISTS "translation_jobs_set_updatedAt" ON "public"."translation_jobs";
ALTER TABLE "public"."translation_jobs" RENAME COLUMN "pageId" TO "page_id";
ALTER TABLE "public"."translation_jobs" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "public"."translation_jobs" RENAME COLUMN "aiModel" TO "ai_model";
ALTER TABLE "public"."translation_jobs" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "public"."translation_jobs" RENAME COLUMN "updatedAt" TO "updated_at";
CREATE INDEX "translation_jobs_user_id_idx" ON public.translation_jobs USING btree ("user_id");
ALTER TABLE ONLY "public"."translation_jobs" ADD CONSTRAINT "translation_jobs_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."translation_jobs" ADD CONSTRAINT "translation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
CREATE TRIGGER "translation_jobs_set_updated_at" BEFORE UPDATE ON "public"."translation_jobs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- usersテーブル
ALTER TABLE "public"."users" RENAME COLUMN "twitterHandle" TO "twitter_handle";
ALTER TABLE "public"."users" RENAME COLUMN "emailVerified" TO "email_verified";

-- verificationsテーブル
ALTER TABLE "public"."verifications" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "public"."verifications" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "public"."verifications" RENAME COLUMN "updatedAt" TO "updated_at";

COMMIT;

