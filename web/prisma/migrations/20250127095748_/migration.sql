BEGIN;

-------------------------------------------------------------------------------
-- 1) translate_texts テーブルの外部キーをリネーム
--    (元: DROP CONSTRAINT, これを RENAME で対応)
-------------------------------------------------------------------------------

ALTER TABLE "translate_texts"
  RENAME CONSTRAINT "translate_texts_page_segment_id_fkey"
  TO "page_segment_translations_page_segment_id_fkey";

ALTER TABLE "translate_texts"
  RENAME CONSTRAINT "translate_texts_user_id_fkey"
  TO "page_segment_translations_user_id_fkey";


-------------------------------------------------------------------------------
-- 2) votes テーブルの外部キーをリネーム
--    (元: DROP CONSTRAINT "votes_translate_text_id_fkey")
-------------------------------------------------------------------------------

ALTER TABLE "votes"
  RENAME CONSTRAINT "votes_translate_text_id_fkey"
  TO "votes_page_segment_translation_id_fkey";


-------------------------------------------------------------------------------
-- 3) votes テーブルのインデックスをリネーム
--    (元: DROP INDEX "votes_translate_text_id_idx", etc.)
-------------------------------------------------------------------------------

ALTER INDEX "votes_translate_text_id_idx"
  RENAME TO "votes_page_segment_translation_id_idx";

ALTER INDEX "votes_translate_text_id_user_id_key"
  RENAME TO "votes_page_segment_translation_id_user_id_key";


-------------------------------------------------------------------------------
-- 4) votes テーブルのカラム「translate_text_id」→「page_segment_translation_id」
--    (元: DROP COLUMN & ADD COLUMN)
-------------------------------------------------------------------------------

-- リネームで既存データを保持したまま変更
ALTER TABLE "votes"
  RENAME COLUMN "translate_text_id" TO "page_segment_translation_id";

-- NOT NULL 制約を設定 (元スクリプトの ADD COLUMN ... NOT NULL 相当)
ALTER TABLE "votes"
  ALTER COLUMN "page_segment_translation_id"
  SET NOT NULL;


-------------------------------------------------------------------------------
-- 5) translate_texts → page_segment_translations (テーブル名リネーム)
--    (元: DROP TABLE "translate_texts" / CREATE TABLE "page_segment_translations")
-------------------------------------------------------------------------------

-- 5-1) 主キー制約などがある場合は、先に RENAME しておく (例)
--      ALTER TABLE "translate_texts"
--        RENAME CONSTRAINT "translate_texts_pkey"
--        TO "page_segment_translations_pkey";

-- 5-2) カラム名を新仕様に合わせる (必要に応じて)
--      例えば "source_text_id" などが既に別マイグレーションで対応済みなら不要。
--      ここでは省略。

-- 5-3) テーブル名のリネーム
ALTER TABLE "translate_texts"
  RENAME TO "page_segment_translations";


-------------------------------------------------------------------------------
-- 6) 元スクリプトの「CREATE TABLE page_segment_translations」や
--    各種 CREATE INDEX、AddForeignKey は不要
--    → 既存テーブル/制約をリネームで再利用するから
-------------------------------------------------------------------------------

COMMIT;