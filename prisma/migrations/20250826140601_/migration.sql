-- ============================================
-- Robust shared-PK migration (pages/page_comments -> contents)
--  - Auto-switch ALL FKs referencing pages(id) / page_comments(id) to ON UPDATE CASCADE
--  - Drop self-referential FKs during remap, then recreate
--  - Remap parent_id explicitly via id-map (no DEFERRABLE dependency)
--  - Avoid pending deferred triggers
-- Preconditions:
--   * pages.content_id, page_comments.content_id are NOT NULL and UNIQUE
--   * Run during maintenance (writes paused)
-- ============================================

-- A) Self-referential FKs: drop up-front
ALTER TABLE public.pages         DROP CONSTRAINT IF EXISTS pages_parent_id_fkey;
ALTER TABLE public.page_comments DROP CONSTRAINT IF EXISTS page_comments_parent_id_fkey;

-- B) Make ALL FKs that reference pages(id) or page_comments(id) use ON UPDATE CASCADE
--    (preserve ON DELETE, MATCH type, deferrability; skip the self-FKs we just dropped)
DO $$
DECLARE
  r RECORD;
  ref_cols TEXT;
  tgt_cols TEXT;
  match_txt TEXT;
  del_txt TEXT;
  def_txt  TEXT;
BEGIN
  FOR r IN
    SELECT
      c.oid              AS con_oid,
      c.conname          AS conname,
      c.conrelid         AS conrelid,      -- referencing table OID
      nr.nspname         AS ref_schema,
      rr.relname         AS ref_table,
      nd.nspname         AS tgt_schema,
      rd.relname         AS tgt_table,
      c.conkey           AS ref_col_nums,
      c.confkey          AS tgt_col_nums,
      c.confrelid        AS confrelid,
      c.confmatchtype    AS confmatchtype,
      c.confdeltype      AS confdeltype,
      c.condeferrable    AS condeferrable,
      c.condeferred      AS condeferred
    FROM pg_constraint c
    JOIN pg_class rr     ON rr.oid = c.conrelid
    JOIN pg_namespace nr ON nr.oid = rr.relnamespace
    JOIN pg_class rd     ON rd.oid = c.confrelid
    JOIN pg_namespace nd ON nd.oid = rd.relnamespace
    WHERE c.contype = 'f'
      AND c.confrelid IN ('public.pages'::regclass, 'public.page_comments'::regclass)
  LOOP
    -- referencing column list
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY s.ord)
      INTO ref_cols
    FROM unnest(r.ref_col_nums) WITH ORDINALITY AS s(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = r.conrelid AND a.attnum = s.attnum;

    -- target (referenced) column list
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY s.ord)
      INTO tgt_cols
    FROM unnest(r.tgt_col_nums) WITH ORDINALITY AS s(attnum, ord)
    JOIN pg_attribute a ON a.attrelid = r.confrelid AND a.attnum = s.attnum;

    -- MATCH type（Postgres は SIMPLE/ FULL のみ）
    match_txt := CASE r.confmatchtype
                   WHEN 'f' THEN ' MATCH FULL'
                   ELSE ''
                 END;

    -- ON DELETE action
    del_txt := CASE r.confdeltype
                 WHEN 'a' THEN ' NO ACTION'
                 WHEN 'r' THEN ' RESTRICT'
                 WHEN 'c' THEN ' CASCADE'
                 WHEN 'n' THEN ' SET NULL'
                 WHEN 'd' THEN ' SET DEFAULT'
               END;

    -- Deferrability
    def_txt := CASE WHEN r.condeferrable THEN
                      CASE WHEN r.condeferred THEN ' DEFERRABLE INITIALLY DEFERRED'
                           ELSE ' DEFERRABLE'
                      END
                    ELSE ''
              END;

    -- Drop & recreate with ON UPDATE CASCADE
    BEGIN
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.ref_schema, r.ref_table, r.conname);
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I.%I (%s)%s ON UPDATE CASCADE ON DELETE%s%s',
        r.ref_schema, r.ref_table, r.conname, ref_cols, r.tgt_schema, r.tgt_table, tgt_cols, match_txt, del_txt, def_txt
      );
    EXCEPTION WHEN undefined_object THEN
      -- self-FKs were dropped in section A; skip recreating them here
      CONTINUE;
    END;
  END LOOP;
END $$;

-- C) PAGES: id -> content_id remap, and parent_id via map
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_content_id_fkey;
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_content_id_key;
DROP INDEX IF EXISTS public.pages_content_id_key;

CREATE TEMP TABLE tmp_pages_idmap ON COMMIT DROP AS
SELECT id AS old_id, content_id AS new_id
FROM public.pages;

DO $$
DECLARE n_nulls BIGINT; n_dups BIGINT;
BEGIN
  SELECT count(*) FILTER (WHERE new_id IS NULL),
         count(*) - count(DISTINCT new_id)
  INTO n_nulls, n_dups
  FROM tmp_pages_idmap;
  IF n_nulls > 0 OR n_dups > 0 THEN
    RAISE EXCEPTION 'pages.content_id must be NOT NULL and UNIQUE (nulls=%, dups=%)', n_nulls, n_dups;
  END IF;
END $$;

UPDATE public.pages p
SET id = -m.new_id
FROM tmp_pages_idmap m
WHERE p.id = m.old_id;

UPDATE public.pages SET id = -id;

UPDATE public.pages p
SET parent_id = m.new_id
FROM tmp_pages_idmap m
WHERE p.parent_id = m.old_id;

UPDATE public.pages ch
SET parent_id = NULL
WHERE ch.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.pages pa WHERE pa.id = ch.parent_id);

ALTER TABLE public.pages ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.pages_id_seq;

ALTER TABLE public.pages DROP COLUMN IF EXISTS content_id;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_id_fkey
  FOREIGN KEY (id) REFERENCES public.contents(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.pages(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- D) PAGE_COMMENTS: id -> content_id remap, and parent_id via map
ALTER TABLE public.page_comments DROP CONSTRAINT IF EXISTS page_comments_content_id_fkey;
ALTER TABLE public.page_comments DROP CONSTRAINT IF EXISTS page_comments_content_id_key;
DROP INDEX IF EXISTS public.page_comments_content_id_key;

CREATE TEMP TABLE tmp_page_comments_idmap ON COMMIT DROP AS
SELECT id AS old_id, content_id AS new_id
FROM public.page_comments;

DO $$
DECLARE n_nulls BIGINT; n_dups BIGINT;
BEGIN
  SELECT count(*) FILTER (WHERE new_id IS NULL),
         count(*) - count(DISTINCT new_id)
  INTO n_nulls, n_dups
  FROM tmp_page_comments_idmap;
  IF n_nulls > 0 OR n_dups > 0 THEN
    RAISE EXCEPTION 'page_comments.content_id must be NOT NULL and UNIQUE (nulls=%, dups=%)', n_nulls, n_dups;
  END IF;
END $$;

UPDATE public.page_comments p
SET id = -m.new_id
FROM tmp_page_comments_idmap m
WHERE p.id = m.old_id;

UPDATE public.page_comments SET id = -id;

UPDATE public.page_comments p
SET parent_id = m.new_id
FROM tmp_page_comments_idmap m
WHERE p.parent_id = m.old_id;

UPDATE public.page_comments ch
SET parent_id = NULL
WHERE ch.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.page_comments pa WHERE pa.id = ch.parent_id);

ALTER TABLE public.page_comments ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.page_comments_id_seq;

ALTER TABLE public.page_comments DROP COLUMN IF EXISTS content_id;

ALTER TABLE public.page_comments
  ADD CONSTRAINT page_comments_id_fkey
  FOREIGN KEY (id) REFERENCES public.contents(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.page_comments
  ADD CONSTRAINT page_comments_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.page_comments(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- E) Assert: all refs to pages/page_comments now ON UPDATE CASCADE
DO $$
DECLARE v_cnt INTEGER;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM pg_constraint c
  WHERE c.contype = 'f'
    AND c.confrelid IN ('public.pages'::regclass, 'public.page_comments'::regclass)
    AND c.confupdtype <> 'c'; -- not CASCADE
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'Some foreign keys still not ON UPDATE CASCADE (count=%). Inspect and fix.', v_cnt;
  END IF;
END $$;
