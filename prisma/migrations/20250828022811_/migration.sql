-- DropIndex
DROP INDEX "public"."page_comments_created_at_idx";

-- DropIndex
DROP INDEX "public"."page_comments_page_id_idx";

-- AlterTable
ALTER TABLE "public"."page_comments" ADD COLUMN     "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_reply_at" TIMESTAMP(3),
ADD COLUMN     "path" INTEGER[],
ADD COLUMN     "reply_count" INTEGER NOT NULL DEFAULT 0;

WITH RECURSIVE tree AS (
  SELECT
    id,
    parent_id,
    '{}'::int[] AS path,
    0 AS depth
  FROM public.page_comments
  WHERE parent_id IS NULL
  UNION ALL
  SELECT
    c.id,
    c.parent_id,
    t.path || t.id AS path,
    array_length(t.path || t.id, 1) AS depth
  FROM public.page_comments c
  JOIN tree t ON c.parent_id = t.id
)
UPDATE public.page_comments pc
SET path  = tree.path,
    depth = tree.depth
FROM tree
WHERE pc.id = tree.id;

-- 2-3) 直下返信数と最終返信時刻を集計（直下に限定）
WITH direct_children AS (
  SELECT parent_id AS pid,
         COUNT(*) AS cnt,
         MAX(created_at) AS last_reply_at
  FROM public.page_comments
  WHERE parent_id IS NOT NULL
  GROUP BY parent_id
)
UPDATE public.page_comments p
SET reply_count = dc.cnt,
    last_reply_at = dc.last_reply_at
FROM direct_children dc
WHERE p.id = dc.pid;

-- CreateIndex
CREATE INDEX "page_comments_path_idx" ON "public"."page_comments" USING GIN ("path");

-- CreateIndex
CREATE INDEX "page_comments_page_id_parent_id_created_at_idx" ON "public"."page_comments"("page_id", "parent_id", "created_at");

-- CreateIndex
CREATE INDEX "page_comments_page_id_depth_created_at_idx" ON "public"."page_comments"("page_id", "depth", "created_at");
