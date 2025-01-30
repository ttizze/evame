/*
  Warnings:

  - You are about to drop the column `sourceLanguage` on the `page_comments` table. All the data in the column will be lost.
  - Added the required column `locale` to the `page_comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "page_comments" DROP COLUMN "sourceLanguage",
ADD COLUMN     "locale" TEXT NOT NULL;
