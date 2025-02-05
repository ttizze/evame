/*
  Warnings:

  - You are about to drop the column `userId` on the `gemini_api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_credentials` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `gemini_api_keys` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `user_credentials` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `gemini_api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `user_credentials` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "gemini_api_keys" DROP CONSTRAINT "gemini_api_keys_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_credentials" DROP CONSTRAINT "user_credentials_userId_fkey";

-- DropIndex
DROP INDEX "gemini_api_keys_userId_idx";

-- DropIndex
DROP INDEX "gemini_api_keys_userId_key";

-- DropIndex
DROP INDEX "user_credentials_userId_idx";

-- DropIndex
DROP INDEX "user_credentials_userId_key";

-- AlterTable
ALTER TABLE "gemini_api_keys" RENAME COLUMN "userId" TO "user_id";

-- AlterTable
ALTER TABLE "user_credentials" RENAME COLUMN "userId" TO "user_id";

-- CreateIndex
CREATE UNIQUE INDEX "gemini_api_keys_user_id_key" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "gemini_api_keys_user_id_idx" ON "gemini_api_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_user_id_key" ON "user_credentials"("user_id");

-- CreateIndex
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials"("user_id");

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gemini_api_keys" ADD CONSTRAINT "gemini_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
