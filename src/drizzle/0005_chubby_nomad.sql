ALTER TABLE "sessions" RENAME COLUMN "sessionToken" TO "token";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "expires" TO "expires_at";--> statement-breakpoint
DROP INDEX "sessions_sessionToken_key";--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" USING btree ("token");