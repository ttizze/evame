BEGIN;

-------------------------------------------------------------------------------
-- 1) source_texts の外部キー制約をリネーム
--    (元: DROP CONSTRAINT "source_texts_page_id_fkey")
-------------------------------------------------------------------------------
ALTER TABLE "source_texts"
  RENAME CONSTRAINT "source_texts_page_id_fkey"
  TO "page_segments_page_id_fkey";


-------------------------------------------------------------------------------
-- 2) translate_texts の外部キー制約をリネーム
--    (元: DROP CONSTRAINT "translate_texts_source_text_id_fkey")
-------------------------------------------------------------------------------
ALTER TABLE "translate_texts"
  RENAME CONSTRAINT "translate_texts_source_text_id_fkey"
  TO "translate_texts_page_segment_id_fkey";


-------------------------------------------------------------------------------
-- 3) translate_texts のインデックスをリネーム
--    (元: DROP INDEX "translate_texts_source_text_id_idx")
-------------------------------------------------------------------------------
ALTER INDEX "translate_texts_source_text_id_idx"
  RENAME TO "translate_texts_page_segment_id_idx";


-------------------------------------------------------------------------------
-- 4) translate_texts のカラムをリネーム & NOT NULL化
--    (元: DROP COLUMN "source_text_id", ADD COLUMN "page_segment_id" INTEGER NOT NULL)
-------------------------------------------------------------------------------
ALTER TABLE "translate_texts"
  RENAME COLUMN "source_text_id" TO "page_segment_id";

ALTER TABLE "translate_texts"
  ALTER COLUMN "page_segment_id"
  SET NOT NULL;


-------------------------------------------------------------------------------
-- 5) source_texts → page_segments  (元: DROP TABLE "source_texts", CREATE TABLE "page_segments")
-------------------------------------------------------------------------------
-- 5-1) 主キー制約のリネーム (もし "source_texts_pkey" が存在するなら)
ALTER TABLE "source_texts"
  RENAME CONSTRAINT "source_texts_pkey"
  TO "page_segments_pkey";

-- 5-2) (必要に応じ) カラム名を新仕様に合わせてリネームする
--     例:  body → text, seq → number, createdAt → created_at, updatedAt → updated_at, etc.
--     ここでは省略。必要なら追記してください。
-- ALTER TABLE "source_texts" RENAME COLUMN "body" TO "text";
-- ALTER TABLE "source_texts" RENAME COLUMN "seq" TO "number";
-- ALTER TABLE "source_texts" RENAME COLUMN "createdAt" TO "created_at";
-- ... など

-- 5-3) テーブル名のリネーム
ALTER TABLE "source_texts"
  RENAME TO "page_segments";


-------------------------------------------------------------------------------
-- 6) もともと「CREATE TABLE page_segments」や「CREATE INDEX ...」などは不要
--    既存テーブルをリネームして使うため、改めてCREATEする必要はない
-------------------------------------------------------------------------------

COMMIT;