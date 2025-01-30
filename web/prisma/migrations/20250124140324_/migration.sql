/*
  Warnings:

  - You are about to drop the `comments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_page_id_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_user_id_fkey";

-- DropTable
DROP TABLE "comments";

-- CreateTable
CREATE TABLE "page_comments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "page_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_comment_source_texts" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "page_comment_id" INTEGER NOT NULL,

    CONSTRAINT "page_comment_source_texts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_comments_user_id_idx" ON "page_comments"("user_id");

-- CreateIndex
CREATE INDEX "page_comments_page_id_idx" ON "page_comments"("page_id");

-- CreateIndex
CREATE INDEX "page_comments_created_at_idx" ON "page_comments"("created_at");

-- CreateIndex
CREATE INDEX "page_comment_source_texts_page_comment_id_idx" ON "page_comment_source_texts"("page_comment_id");

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comments" ADD CONSTRAINT "page_comments_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_source_texts" ADD CONSTRAINT "page_comment_source_texts_page_comment_id_fkey" FOREIGN KEY ("page_comment_id") REFERENCES "page_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
