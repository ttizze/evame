CREATE TYPE "SegmentTypeKey" AS ENUM ('PRIMARY', 'COMMENTARY');
ALTER TABLE "segment_types" ADD COLUMN key_new "SegmentTypeKey";
UPDATE "segment_types"
SET key_new = CASE
	WHEN key = 'PRIMARY' THEN 'PRIMARY'::"SegmentTypeKey"
	ELSE 'COMMENTARY'::"SegmentTypeKey"
END;
ALTER TABLE "segments" DROP CONSTRAINT segments_segment_type_id_fkey;
-- 代表行を決めて segments の外部キーを付け替える（PRIMARY はそのまま、COMMENTARYは1件に寄せる）
-- 余分な segment_types 行を削除
ALTER TABLE "segment_types" DROP COLUMN "key";
ALTER TABLE "segment_types" RENAME COLUMN key_new TO "key";
ALTER TABLE "segment_types" ALTER COLUMN "key" SET NOT NULL;
-- weight を DROP
-- 外部キー/ユニークインデックスを再作成
