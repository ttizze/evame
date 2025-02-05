/*
  Warnings:

  - You are about to drop the `user_emails` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
BEGIN;
ALTER TABLE "user_emails" DROP CONSTRAINT "user_emails_user_id_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT;

UPDATE users
SET email = ue.email
FROM user_emails ue
WHERE users.id = ue.user_id;
-- DropTable
DROP TABLE "user_emails";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

COMMIT;