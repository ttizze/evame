/*
  Warnings:

  - Made the column `content_id` on table `page_comments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content_id` on table `pages` required. This step will fail if there are existing NULL values in that column.

*/

-- 1) Page -> Content 作成＆紐付け
WITH to_make AS (
  SELECT id AS page_id, created_at, updated_at,
         row_number() OVER (ORDER BY id) AS rn
  FROM pages
  WHERE content_id IS NULL
),
ins AS (
  INSERT INTO contents(kind, created_at, updated_at)
  SELECT 'PAGE', created_at, updated_at
  FROM to_make
  ORDER BY rn
  RETURNING id
),
ins_numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn
  FROM ins
)
UPDATE pages p
SET content_id = insn.id
FROM to_make tm
JOIN ins_numbered insn USING (rn)
WHERE p.id = tm.page_id;

-- 2) PageComment -> Content 作成＆紐付け
WITH to_make AS (
  SELECT id AS comment_id, created_at, updated_at,
         row_number() OVER (ORDER BY id) AS rn
  FROM page_comments
  WHERE content_id IS NULL
),
ins AS (
  INSERT INTO contents(kind, created_at, updated_at)
  SELECT 'PAGE_COMMENT', created_at, updated_at
  FROM to_make
  ORDER BY rn
  RETURNING id
),
ins_numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn
  FROM ins
)
UPDATE page_comments pc
SET content_id = insn.id
FROM to_make tm
JOIN ins_numbered insn USING (rn)
WHERE pc.id = tm.comment_id;

-- 3) PageSegment -> Segment
INSERT INTO segments (content_id, number, text, text_and_occurrence_hash, created_at)
SELECT p.content_id, ps.number, ps.text, ps.text_and_occurrence_hash, ps.created_at
FROM page_segments ps
JOIN pages p ON p.id = ps.page_id
ON CONFLICT (content_id, text_and_occurrence_hash) DO NOTHING;

-- 4) PageCommentSegment -> Segment
INSERT INTO segments (content_id, number, text, text_and_occurrence_hash, created_at)
SELECT pc.content_id, pcs.number, pcs.text, pcs.text_and_occurrence_hash, pcs.created_at
FROM page_comment_segments pcs
JOIN page_comments pc ON pc.id = pcs.page_comment_id
ON CONFLICT (content_id, text_and_occurrence_hash) DO NOTHING;

-- 5) PageSegmentTranslation(未アーカイブのみ) -> SegmentTranslation
INSERT INTO segment_translations (segment_id, locale, text, point, created_at,  user_id)
SELECT s.id, pst.locale, pst.text, pst.point, pst.created_at,  pst.user_id
FROM page_segment_translations pst
JOIN page_segments ps ON ps.id = pst.page_segment_id
JOIN pages p ON p.id = ps.page_id
JOIN segments s ON s.content_id = p.content_id AND s.text_and_occurrence_hash = ps.text_and_occurrence_hash
WHERE pst.is_archived = false;

-- 6) PageCommentSegmentTranslation -> SegmentTranslation
INSERT INTO segment_translations (segment_id, locale, text, point, created_at,  user_id)
SELECT s.id, pcst.locale, pcst.text, pcst.point, pcst.created_at,  pcst.user_id
FROM page_comment_segment_translations pcst
JOIN page_comment_segments pcs ON pcs.id = pcst.page_comment_segment_id
JOIN page_comments pc ON pc.id = pcs.page_comment_id
JOIN segments s ON s.content_id = pc.content_id AND s.text_and_occurrence_hash = pcs.text_and_occurrence_hash;

-- 7) Vote -> TranslationVote
INSERT INTO translation_votes (translation_id, user_id, is_upvote, created_at, updated_at)
SELECT st.id, v.user_id, v.is_upvote, v.created_at, v.updated_at
FROM votes v
JOIN page_segment_translations pst ON pst.id = v.page_segment_translation_id
JOIN page_segments ps ON ps.id = pst.page_segment_id
JOIN pages p ON p.id = ps.page_id
JOIN segments s ON s.content_id = p.content_id AND s.text_and_occurrence_hash = ps.text_and_occurrence_hash
JOIN segment_translations st
  ON st.segment_id = s.id AND st.locale = pst.locale AND st.user_id = pst.user_id AND st.text = pst.text
ON CONFLICT (translation_id, user_id) DO NOTHING;

-- 8) PageCommentSegmentTranslationVote -> TranslationVote
INSERT INTO translation_votes (translation_id, user_id, is_upvote, created_at, updated_at)
SELECT st.id, pcstv.user_id, pcstv.is_upvote, pcstv.created_at, pcstv.updated_at
FROM page_comment_segment_translation_votes pcstv
JOIN page_comment_segment_translations pcst ON pcst.id = pcstv.page_comment_segment_translation_id
JOIN page_comment_segments pcs ON pcs.id = pcst.page_comment_segment_id
JOIN page_comments pc ON pc.id = pcs.page_comment_id
JOIN segments s ON s.content_id = pc.content_id AND s.text_and_occurrence_hash = pcs.text_and_occurrence_hash
JOIN segment_translations st
  ON st.segment_id = s.id AND st.locale = pcst.locale AND st.user_id = pcst.user_id AND st.text = pcst.text
ON CONFLICT (translation_id, user_id) DO NOTHING;

-- 9) Notifications の新参照を充填（SegmentTranslation）
UPDATE notifications n
SET segment_translation_id = st.id
FROM page_segment_translations pst
JOIN page_segments ps ON ps.id = pst.page_segment_id
JOIN pages p ON p.id = ps.page_id
JOIN segments s ON s.content_id = p.content_id AND s.text_and_occurrence_hash = ps.text_and_occurrence_hash
JOIN segment_translations st
  ON st.segment_id = s.id AND st.locale = pst.locale AND st.user_id = pst.user_id AND st.text = pst.text
WHERE n.page_segment_translation_id = pst.id
  AND n.segment_translation_id IS NULL;

UPDATE notifications n
SET segment_translation_id = st.id
FROM page_comment_segment_translations pcst
JOIN page_comment_segments pcs ON pcs.id = pcst.page_comment_segment_id
JOIN page_comments pc ON pc.id = pcs.page_comment_id
JOIN segments s ON s.content_id = pc.content_id AND s.text_and_occurrence_hash = pcs.text_and_occurrence_hash
JOIN segment_translations st
  ON st.segment_id = s.id AND st.locale = pcst.locale AND st.user_id = pcst.user_id AND st.text = pcst.text
WHERE n.page_comment_segment_translation_id = pcst.id
  AND n.segment_translation_id IS NULL;
-- AlterTable
ALTER TABLE "public"."page_comments" ALTER COLUMN "content_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."pages" ALTER COLUMN "content_id" SET NOT NULL;
