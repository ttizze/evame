/*
  Warnings:

  - You are about to drop the column `claude_api_key` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `gemini_api_key` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `openai_api_key` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable


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

INSERT INTO "gemini_api_keys" ("api_key", "userId")
SELECT "gemini_api_key", "id"
  FROM "users"
 WHERE "gemini_api_key" IS NOT NULL;

ALTER TABLE "users" DROP COLUMN "claude_api_key",
DROP COLUMN "gemini_api_key",
DROP COLUMN "openai_api_key",
DROP COLUMN "password";
-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_userId_key" ON "user_credentials"("userId");

-- CreateIndex
CREATE INDEX "user_credentials_userId_idx" ON "user_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gemini_api_keys_userId_key" ON "gemini_api_keys"("userId");

-- CreateIndex
CREATE INDEX "gemini_api_keys_userId_idx" ON "gemini_api_keys"("userId");

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
