/*
  Warnings:

  - You are about to drop the column `new_follower_id` on the `follows` table. All the data in the column will be lost.
  - You are about to drop the column `new_following_id` on the `follows` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `gemini_api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `like_pages` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `page_comment_segment_translation_votes` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `page_comment_segment_translations` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `page_comments` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `page_segment_translations` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `user_ai_translation_info` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `user_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `user_emails` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cuid` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `new_user_id` on the `votes` table. All the data in the column will be lost.

*/

BEGIN;

--DropForeignKey
------------------------------------------------------------------------------
-- 1) User以外のテーブルにある newUserId (まだ空) に、User.cuid の値をコピー
--    すでに "User.cuid" にはユニークな値が入っている前提
------------------------------------------------------------------------------

UPDATE "user_emails" ue
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE ue."user_id" = u."id";

UPDATE "user_credentials" uc
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE uc."user_id" = u."id";

UPDATE "gemini_api_keys" g
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE g."user_id" = u."id";

UPDATE "follows" f
SET "new_follower_id" = u."cuid"
FROM "users" u
WHERE f."follower_id" = u."id";

UPDATE "follows" f2
SET "new_following_id" = u."cuid"
FROM "users" u
WHERE f2."following_id" = u."id";

UPDATE "user_ai_translation_info" ai
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE ai."user_id" = u."id";

UPDATE "pages" p
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE p."user_id" = u."id";

UPDATE "page_segment_translations" pst
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE pst."user_id" = u."id";

UPDATE "like_pages" lp
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE lp."user_id" = u."id";

UPDATE "votes" v
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE v."user_id" = u."id";

UPDATE "page_comments" pc
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE pc."user_id" = u."id";

UPDATE "page_comment_segment_translations" pcst
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE pcst."user_id" = u."id";

UPDATE "page_comment_segment_translation_votes" pcstv
SET "new_user_id" = u."cuid"
FROM "users" u
WHERE pcstv."user_id" = u."id";


------------------------------------------------------------------------------
-- 2) users_pkey を CASCADE で削除し、同時に依存する外部キーも一掃
--    ※ 他テーブルの old userId(Int) カラムには FKey が張られている想定
------------------------------------------------------------------------------

ALTER TABLE "users" DROP CONSTRAINT "users_pkey" CASCADE;

------------------------------------------------------------------------------
-- 3) User テーブル: 旧 int ID カラムを消し、cuid を id にリネーム → NOT NULL → PK
------------------------------------------------------------------------------

ALTER TABLE "users" DROP COLUMN IF EXISTS "id";

ALTER TABLE "users" RENAME COLUMN "cuid" TO "id";
ALTER TABLE "users" ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "users"
  ADD CONSTRAINT "users_pkey"
  PRIMARY KEY ("id");

------------------------------------------------------------------------------
-- 4) 他テーブル: 旧 userId(Int) を DROP,
--    newUserId(String) → userId に RENAME,
--    外部キーを貼り直す (すべて1から再作成)
------------------------------------------------------------------------------

-- ========== UserEmail ==========
ALTER TABLE "user_emails"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "user_emails"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "user_emails"
  ALTER COLUMN "user_id" SET NOT NULL;

-- 必要に応じて UNIQUEなど復元 (例) 
-- ALTER TABLE "user_emails"
--   ADD CONSTRAINT "user_emails_user_id_key" UNIQUE ("user_id");

ALTER TABLE "user_emails"
  ADD CONSTRAINT "user_emails_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== UserCredential ==========
ALTER TABLE "user_credentials"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "user_credentials"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "user_credentials"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "user_credentials"
  ADD CONSTRAINT "user_credentials_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== GeminiApiKey ==========
ALTER TABLE "gemini_api_keys"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "gemini_api_keys"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "gemini_api_keys"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "gemini_api_keys"
  ADD CONSTRAINT "gemini_api_keys_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== Follow (followerId / followingId) ==========
ALTER TABLE "follows" DROP COLUMN IF EXISTS "follower_id";
ALTER TABLE "follows" DROP COLUMN IF EXISTS "following_id";

ALTER TABLE "follows" RENAME COLUMN "new_follower_id" TO "follower_id";
ALTER TABLE "follows" RENAME COLUMN "new_following_id" TO "following_id";

ALTER TABLE "follows" ALTER COLUMN "follower_id" SET NOT NULL;
ALTER TABLE "follows" ALTER COLUMN "following_id" SET NOT NULL;

-- もともと unique(follower_id, following_id) が必要なら
ALTER TABLE "follows"
  ADD CONSTRAINT "follows_follower_id_following_id_key"
  UNIQUE ("follower_id", "following_id");

ALTER TABLE "follows"
  ADD CONSTRAINT "follows_followerId_fkey"
  FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "follows"
  ADD CONSTRAINT "follows_followingId_fkey"
  FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== UserAITranslationInfo ==========
ALTER TABLE "user_ai_translation_info"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "user_ai_translation_info"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "user_ai_translation_info"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "user_ai_translation_info"
  ADD CONSTRAINT "user_ai_translation_info_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== Page ==========
ALTER TABLE "pages"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "pages"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "pages"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "pages"
  ADD CONSTRAINT "pages_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== PageSegmentTranslation ==========
ALTER TABLE "page_segment_translations"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "page_segment_translations"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "page_segment_translations"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "page_segment_translations"
  ADD CONSTRAINT "page_segment_translations_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== LikePage ==========
ALTER TABLE "like_pages"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "like_pages"
  RENAME COLUMN "new_user_id" TO "user_id";

/* userId が NULL許可なら SET NOT NULL は不要 */
-- ALTER TABLE "like_pages" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "like_pages"
  ADD CONSTRAINT "like_pages_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== Vote ==========
ALTER TABLE "votes"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "votes"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "votes"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "votes"
  ADD CONSTRAINT "votes_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== PageComment ==========
ALTER TABLE "page_comments"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "page_comments"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "page_comments"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "page_comments"
  ADD CONSTRAINT "page_comments_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== PageCommentSegmentTranslation ==========
ALTER TABLE "page_comment_segment_translations"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "page_comment_segment_translations"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "page_comment_segment_translations"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "page_comment_segment_translations"
  ADD CONSTRAINT "page_comment_segment_translations_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;


-- ========== PageCommentSegmentTranslationVote ==========
ALTER TABLE "page_comment_segment_translation_votes"
  DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "page_comment_segment_translation_votes"
  RENAME COLUMN "new_user_id" TO "user_id";

ALTER TABLE "page_comment_segment_translation_votes"
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "page_comment_segment_translation_votes"
  ADD CONSTRAINT "page_comment_segment_translation_votes_userId_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

/* 終了 */

COMMIT;