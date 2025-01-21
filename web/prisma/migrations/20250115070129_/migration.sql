
-- 1) 一時カラム temp_status を追加 (TEXT型)
ALTER TABLE "pages"
ADD COLUMN "temp_status" TEXT DEFAULT 'DRAFT';

-- 2) is_published / is_archived の値から、temp_status を埋める
UPDATE "pages"
SET "temp_status" = CASE
    WHEN "is_published" = TRUE THEN 'PUBLIC'
    WHEN "is_archived"  = TRUE THEN 'ARCHIVE'
    ELSE 'DRAFT'
END;

-- 3) enum PageStatus を作成
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLIC', 'ARCHIVE');

-- 4) PageStatus型の status カラムを追加 (デフォルトは DRAFT)
ALTER TABLE "pages"
ADD COLUMN "status" "PageStatus" NOT NULL DEFAULT 'DRAFT';

-- 5) temp_status → status(enum) へ変換コピー (キャストを明示)
UPDATE "pages"
SET "status" = (
  CASE
    WHEN "temp_status" = 'PUBLIC'  THEN 'PUBLIC'
    WHEN "temp_status" = 'ARCHIVE' THEN 'ARCHIVE'
    ELSE 'DRAFT'
  END
)::"PageStatus";

-- 6) 旧カラムを削除
ALTER TABLE "pages"
DROP COLUMN "is_archived",
DROP COLUMN "is_published",
DROP COLUMN "temp_status";

