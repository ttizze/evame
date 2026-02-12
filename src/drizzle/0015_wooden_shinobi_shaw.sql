CREATE TABLE "personal_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"last_used_at" timestamp (3)
);
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "published_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "archived_at" timestamp (3);--> statement-breakpoint
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_access_tokens_key_hash_key" ON "personal_access_tokens" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "personal_access_tokens_user_id_idx" ON "personal_access_tokens" USING btree ("user_id");