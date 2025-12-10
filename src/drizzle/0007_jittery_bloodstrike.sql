ALTER TABLE "accounts" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "providerId" TO "provider_id";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "accountId" TO "account_id";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";--> statement-breakpoint
ALTER TABLE "import_files" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "page_views" RENAME COLUMN "pageId" TO "page_id";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "ipAddress" TO "ip_address";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "userAgent" TO "user_agent";--> statement-breakpoint
ALTER TABLE "tag_pages" RENAME COLUMN "tagId" TO "tag_id";--> statement-breakpoint
ALTER TABLE "tag_pages" RENAME COLUMN "pageId" TO "page_id";--> statement-breakpoint
ALTER TABLE "translation_jobs" RENAME COLUMN "pageId" TO "page_id";--> statement-breakpoint
ALTER TABLE "translation_jobs" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "translation_jobs" RENAME COLUMN "aiModel" TO "ai_model";--> statement-breakpoint
ALTER TABLE "translation_jobs" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "translation_jobs" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "twitterHandle" TO "twitter_handle";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "email_verified";--> statement-breakpoint
ALTER TABLE "verifications" RENAME COLUMN "expiresAt" TO "expires_at";--> statement-breakpoint
ALTER TABLE "verifications" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "verifications" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";
--> statement-breakpoint
ALTER TABLE "page_views" DROP CONSTRAINT "page_views_pageId_fkey";
--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";
--> statement-breakpoint
ALTER TABLE "tag_pages" DROP CONSTRAINT "tag_pages_pageId_fkey";
--> statement-breakpoint
ALTER TABLE "tag_pages" DROP CONSTRAINT "tag_pages_tagId_fkey";
--> statement-breakpoint
ALTER TABLE "translation_jobs" DROP CONSTRAINT "translation_jobs_pageId_fkey";
--> statement-breakpoint
ALTER TABLE "translation_jobs" DROP CONSTRAINT "translation_jobs_userId_fkey";
--> statement-breakpoint
DROP INDEX "accounts_provider_accountId_key";--> statement-breakpoint
DROP INDEX "tag_pages_pageId_idx";--> statement-breakpoint
DROP INDEX "tag_pages_tagId_idx";--> statement-breakpoint
DROP INDEX "translation_jobs_userId_idx";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_pageId_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_pageId_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_tagId_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_pageId_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_accountId_key" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "tag_pages_pageId_idx" ON "tag_pages" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "tag_pages_tagId_idx" ON "tag_pages" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "translation_jobs_userId_idx" ON "translation_jobs" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "tag_pages" DROP CONSTRAINT "tag_pages_pkey";
--> statement-breakpoint
ALTER TABLE "tag_pages" ADD CONSTRAINT "tag_pages_pkey" PRIMARY KEY("tag_id","page_id");