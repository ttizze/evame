/*
  Warnings:

  - You are about to drop the column `text` on the `page_comments` table. All the data in the column will be lost.
  - Added the required column `content` to the `page_comments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "page_comments" DROP COLUMN "text",
ADD COLUMN     "content" TEXT NOT NULL;
