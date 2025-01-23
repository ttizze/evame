/*
  Warnings:

  - You are about to drop the `CustomAIModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `api_usage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `genre_pages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `genres` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_read_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomAIModel" DROP CONSTRAINT "CustomAIModel_userId_fkey";

-- DropForeignKey
ALTER TABLE "api_usage" DROP CONSTRAINT "api_usage_user_id_fkey";

-- DropForeignKey
ALTER TABLE "genre_pages" DROP CONSTRAINT "genre_pages_genreId_fkey";

-- DropForeignKey
ALTER TABLE "genre_pages" DROP CONSTRAINT "genre_pages_pageId_fkey";

-- DropForeignKey
ALTER TABLE "user_read_history" DROP CONSTRAINT "user_read_history_page_id_fkey";

-- DropForeignKey
ALTER TABLE "user_read_history" DROP CONSTRAINT "user_read_history_user_id_fkey";

-- DropTable
DROP TABLE "CustomAIModel";

-- DropTable
DROP TABLE "api_usage";

-- DropTable
DROP TABLE "genre_pages";

-- DropTable
DROP TABLE "genres";

-- DropTable
DROP TABLE "user_read_history";
