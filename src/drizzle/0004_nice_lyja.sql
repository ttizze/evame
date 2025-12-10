ALTER TABLE "accounts" RENAME COLUMN "provider" TO "providerId";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "providerAccountId" TO "accountId";--> statement-breakpoint
DROP INDEX "accounts_provider_providerAccountId_key";--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_accountId_key" ON "accounts" USING btree ("providerId","accountId");