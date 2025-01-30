-- CreateTable
CREATE TABLE "page_comment_votes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "page_comment_segment_translation_id" INTEGER NOT NULL,
    "is_upvote" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_comment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_comment_votes_page_comment_segment_translation_id_idx" ON "page_comment_votes"("page_comment_segment_translation_id");

-- CreateIndex
CREATE INDEX "page_comment_votes_user_id_idx" ON "page_comment_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_comment_votes_page_comment_segment_translation_id_user_key" ON "page_comment_votes"("page_comment_segment_translation_id", "user_id");

-- AddForeignKey
ALTER TABLE "page_comment_votes" ADD CONSTRAINT "page_comment_votes_page_comment_segment_translation_id_fkey" FOREIGN KEY ("page_comment_segment_translation_id") REFERENCES "page_comment_segment_translations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_comment_votes" ADD CONSTRAINT "page_comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
