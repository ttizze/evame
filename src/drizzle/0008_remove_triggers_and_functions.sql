-- トリガーを削除（updated_atの自動更新を削除）
DROP TRIGGER IF EXISTS "accounts_set_updated_at" ON "public"."accounts";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "contents_set_updated_at" ON "public"."contents";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "page_comments_set_updated_at" ON "public"."page_comments";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "pages_set_updated_at" ON "public"."pages";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sessions_set_updated_at" ON "public"."sessions";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "translation_jobs_set_updatedAt" ON "public"."translation_jobs";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "translation_votes_set_updated_at" ON "public"."translation_votes";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "user_settings_set_updated_at" ON "public"."user_settings";
--> statement-breakpoint
DROP TRIGGER IF EXISTS "users_set_updated_at" ON "public"."users";

-- ストアド関数を削除
DROP FUNCTION IF EXISTS "public"."set_updated_at"();
--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."set_updatedat"();

